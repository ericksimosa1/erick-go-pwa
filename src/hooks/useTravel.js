// src/hooks/useTravel.js
import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore'; // Ruta corregida

export const useTravel = () => {
    const user = useAuthStore(state => state.user); // Obtenemos solo el usuario, no todo el estado
    const [todayTravel, setTodayTravel] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Si no hay usuario o no tiene UID, no hacemos nada y salimos del efecto.
        if (!user || !user.uid) {
            setTodayTravel(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        const today = new Date().toISOString().split('T')[0];
        const q = query(
            collection(db, 'viajes'),
            where('fecha', '==', today),
            where('idConductor', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            if (!querySnapshot.empty) {
                const travelData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
                setTodayTravel(travelData);
            } else {
                setTodayTravel(null);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error al escuchar el viaje:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]); // El efecto solo se vuelve a ejecutar si el objeto `user` cambia

    const startTravel = async (empleadosAsignados) => {
        if (!user || !user.uid) return null;
        const today = new Date().toISOString().split('T')[0];
        try {
            const docRef = await addDoc(collection(db, 'viajes'), {
                fecha: today,
                idConductor: user.uid,
                estado: 'en_curso',
                empleadosAsignados,
                subViajes: [],
            });
            return docRef.id;
        } catch (error) {
            console.error("Error al iniciar viaje:", error);
            return null;
        }
    };

    const finishTravel = async () => {
        if (!todayTravel || !todayTravel.id) return;
        try {
            await updateDoc(doc(db, 'viajes', todayTravel.id), { estado: 'finalizado' });
        } catch (error) {
            console.error("Error al finalizar viaje:", error);
        }
    };

    return { todayTravel, loading, startTravel, finishTravel };
};