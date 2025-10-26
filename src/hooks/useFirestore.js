// src/hooks/useFirestore.js
import { db } from '../firebase';
import {
    collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, setDoc, Timestamp, documentId, writeBatch, arrayRemove, onSnapshot
} from 'firebase/firestore';
import { useCallback } from 'react';

export const useFirestore = () => {

    // --- FUNCIONES DE USUARIOS ---
    const fetchUsers = useCallback(async () => {
        const usersCollection = collection(db, 'usuarios');
        const userSnapshot = await getDocs(usersCollection);
        const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return userList;
    }, []);

    const updateUser = useCallback(async (userId, userData) => {
        const userRef = doc(db, 'usuarios', userId);
        await updateDoc(userRef, userData);
    }, []);

    const fetchUserByEmail = useCallback(async (email) => {
        const usersCollection = collection(db, 'usuarios');
        const q = query(usersCollection, where('correo', '==', email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
        }
        return null;
    }, []);

    const fetchUsersByClient = useCallback(async (clientId) => {
        if (!clientId) return [];
        console.log(`[fetchUsersByClient] Iniciando carga para clientId: ${clientId}`);

        try {
            const vinculosCollection = collection(db, 'vinculos');
            const qVinculos = query(vinculosCollection, where('clientId', '==', clientId), where('activo', '==', true));
            const vinculosSnapshot = await getDocs(qVinculos);

            if (vinculosSnapshot.empty) {
                console.log(`[fetchUsersByClient] No se encontraron vínculos para clientId: ${clientId}`);
                return [];
            }

            const userIds = vinculosSnapshot.docs.map(doc => doc.data().userId);

            // Si no hay usuarios, retornar array vacío
            if (userIds.length === 0) {
                return [];
            }

            const usersCollection = collection(db, 'usuarios');
            const qUsers = query(usersCollection, where(documentId(), 'in', userIds));
            const usersSnapshot = await getDocs(qUsers);

            const usersMap = {};
            usersSnapshot.docs.forEach(doc => {
                usersMap[doc.id] = doc.data();
            });
            
            const usersList = vinculosSnapshot.docs.map(vinculoDoc => {
                const vinculoData = { id: vinculoDoc.id, ...vinculoDoc.data() };
                const userDoc = usersSnapshot.docs.find(uDoc => uDoc.id === vinculoData.userId);
                
                if (userDoc) {
                    const userData = { id: userDoc.id, ...userDoc.data() };
                    const userObject = {
                        userId: userData.id,
                        vinculoId: vinculoData.id,
                        userData: {
                            correo: userData.correo || '',
                            nombre: userData.nombre || 'Sin nombre',
                            rol: vinculoData.rol || userData.rol || 'Sin rol',
                            telefono: userData.telefono || 'Sin teléfono',
                        },
                        zonasAsignadas: vinculoData.zonasAsignadas || [],
                        gruposZonas: vinculoData.gruposZonas || [],
                        esEncargadoCierre: vinculoData.esEncargadoCierre || false,
                    };
                    console.log(`[fetchUsersByClient] Usuario ${userData.nombre} (Vinculo: ${vinculoData.id}) tiene GRUPOS:`, userObject.gruposZonas);
                    return userObject;
                }
                return null;
            }).filter(Boolean);

            return usersList;

        } catch (error) {
            console.error("Error en fetchUsersByClient:", error);
            return [];
        }
    }, []);

    // --- FUNCIONES DE VÍNCULOS (USUARIO-CLIENTE) ---
    const fetchUserVinculos = useCallback(async (userId) => {
        const q = query(collection(db, 'vinculos'), where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, []);

    const updateUserVinculo = useCallback(async (vinculoId, vinculoData) => {
        const vinculoRef = doc(db, 'vinculos', vinculoId);
        await updateDoc(vinculoRef, vinculoData);
    }, []);

    const deactivateUserVinculo = useCallback(async (vinculoId) => {
        const vinculoRef = doc(db, 'vinculos', vinculoId);
        await updateDoc(vinculoRef, { activo: false });
    }, []);

    const createVinculo = useCallback(async (userId, clientId, rol) => {
        if (!rol) {
            console.error("Error: Se intentó crear un vínculo sin especificar un rol.");
            throw new Error("El rol es obligatorio para crear un vínculo.");
        }

        const vinculosCollection = collection(db, 'vinculos');
        const newVinculo = {
            userId: userId,
            clientId: clientId,
            rol: rol,
            activo: true,
            zonasAsignadas: [],
            fechaCreacion: Timestamp.now()
        };
        const docRef = await addDoc(vinculosCollection, newVinculo);
        return docRef.id;
    }, []);

    // --- FUNCIONES DE CLIENTES (EMPRESAS) ---
    const fetchClients = useCallback(async () => {
        const clientsCollection = collection(db, 'clientes');
        const clientSnapshot = await getDocs(clientsCollection);
        return clientSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, []);

    const addClient = useCallback(async (clientData) => {
        const clientsCollection = collection(db, 'clientes');
        const docRef = await addDoc(clientsCollection, clientData);
        return docRef;
    }, []);

    const updateClient = useCallback(async (clientId, clientData) => {
        const clientRef = doc(db, 'clientes', clientId);
        await updateDoc(clientRef, clientData);
    }, []);

    const deleteClient = useCallback(async (clientId) => {
        const clientRef = doc(db, 'clientes', clientId);
        await deleteDoc(clientRef);
    }, []);

    // --- FUNCIONES DE ZONAS ---
    const fetchZones = useCallback(async (clientId) => {
        const q = query(collection(db, 'zonas'), where('clientId', '==', clientId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, []);

    const addZone = useCallback(async (zoneData) => {
        const zonesCollection = collection(db, 'zonas');
        const docRef = await addDoc(zonesCollection, zoneData);
        return docRef;
    }, []);

    const updateZone = useCallback(async (zoneId, zoneData) => {
        const zoneRef = doc(db, 'zonas', zoneId);
        await updateDoc(zoneRef, zoneData);
    }, []);

    const deleteZone = useCallback(async (zoneId) => {
        const zoneRef = doc(db, 'zonas', zoneId);
        await deleteDoc(zoneRef);
    }, []);

    // --- FUNCIONES DE VIAJES ---
    const addTrip = useCallback(async (tripData) => {
        const tripsCollection = collection(db, 'trips');
        const docRef = await addDoc(tripsCollection, tripData);
        return docRef;
    }, []);
    
    // --- FUNCIONES DE ASISTENCIA ---
    const fetchTodayAsistencias = useCallback(async (clientId) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const q = query(
            collection(db, 'asistencias'),
            where('clientId', '==', clientId),
            where('fecha', '>=', Timestamp.fromDate(today)),
            where('fecha', '<', Timestamp.fromDate(tomorrow)),
            where('completado', '==', false) // Solo obtener asistencias no completadas
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, []);

    const setOrUpdateAsistencia = useCallback(async (userId, zoneId, userName, clientId) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const q = query(
            collection(db, 'asistencias'),
            where('empleadoId', '==', userId),
            where('fecha', '>=', Timestamp.fromDate(today)),
            where('fecha', '<', Timestamp.fromDate(tomorrow))
        );
        const querySnapshot = await getDocs(q);

        const asistenciaData = {
            empleadoId: userId,
            empleadoNombre: userName,
            zona: zoneId,
            clientId: clientId,
            fecha: Timestamp.now(),
            completado: false
        };

        if (querySnapshot.empty) {
            await addDoc(collection(db, 'asistencias'), asistenciaData);
        } else {
            const docRef = doc(db, 'asistencias', querySnapshot.docs[0].id);
            await updateDoc(docRef, asistenciaData);
        }
    }, []);

    const fetchMyAsistenciaForToday = useCallback(async (userId) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const q = query(
            collection(db, 'asistencias'),
            where('empleadoId', '==', userId),
            where('fecha', '>=', Timestamp.fromDate(today)),
            where('fecha', '<', Timestamp.fromDate(tomorrow)),
            limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
        }
        return null;
    }, []);

    const markAsistenciaAsCompleted = useCallback(async (asistenciaId) => {
        const asistenciaRef = doc(db, 'asistencias', asistenciaId);
        await updateDoc(asistenciaRef, { 
            completado: true, 
            fechaCompletado: Timestamp.now() 
        });
    }, []);

    // ====================================================================
    // CORRECCIÓN: Nueva función para eliminar la asistencia de un empleado
    // ====================================================================
    const deleteEmployeeAttendanceForToday = useCallback(async (asistenciaId, employeeId) => {
        const batch = writeBatch(db);
        const asistenciaRef = doc(db, 'asistencias', asistenciaId);

        // 1. Eliminar el documento de asistencia
        batch.delete(asistenciaRef);

        // 2. Buscar si el empleado está en un viaje activo y removerlo
        const tripsQuery = query(
            collection(db, 'trips'),
            where('empleadosIds', 'array-contains', employeeId),
            where('estado', '==', 'en_progreso')
        );
        const tripSnapshot = await getDocs(tripsQuery);

        if (!tripSnapshot.empty) {
            const tripRef = doc(db, 'trips', tripSnapshot.docs[0].id);
            // Remover el ID del empleado del array
            batch.update(tripRef, { empleadosIds: arrayRemove(employeeId) });
        }

        // 3. Ejecutar todas las operaciones
        await batch.commit();
    }, []);

    // --- NUEVAS FUNCIONES PARA HERRAMIENTAS ADMINISTRATIVAS ---
    
    // Función auxiliar para obtener todos los vínculos y depurar
    const debugAllVinculos = useCallback(async () => {
        console.log("[DEBUG] Obteniendo todos los vínculos para depuración...");
        const vinculosCollection = collection(db, 'vinculos');
        const allVinculosSnapshot = await getDocs(vinculosCollection);
        
        console.log("[DEBUG] Analizando los primeros 5 vínculos en detalle:");
        allVinculosSnapshot.docs.slice(0, 5).forEach((doc, index) => {
            const data = doc.data();
            console.log(`[DEBUG] Vínculo ${index + 1}:`, {
                id: doc.id,
                userId: data.userId,
                clientId: data.clientId,
                rol: data.rol,
                activo: data.activo,
                allFields: Object.keys(data)
            });
        });
        
        const rolesCount = {};
        allVinculosSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const rol = data.rol;
            rolesCount[rol] = (rolesCount[rol] || 0) + 1;
        });
        
        console.log("[DEBUG] Conteo de roles en todos los vínculos:", rolesCount);
        return allVinculosSnapshot;
    }, []);
    
    // Eliminar usuarios por rol (excepto administradores)
    const deleteUsersByRole = useCallback(async (role) => {
        if (!role || !['empleado', 'conductor', 'cliente'].includes(role)) {
            throw new Error("Rol inválido. Debe ser 'empleado', 'conductor' o 'cliente'.");
        }

        console.log(`Iniciando eliminación masiva de usuarios con rol: ${role}`);
        
        if (role === 'cliente') {
            const clientsCollection = collection(db, 'clientes');
            const clientsSnapshot = await getDocs(clientsCollection);
            const batch = writeBatch(db);
            clientsSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            console.log(`Se eliminaron ${clientsSnapshot.size} clientes`);
            return { deletedCount: clientsSnapshot.size };
        }
        
        const vinculosCollection = collection(db, 'vinculos');
        const allVinculosSnapshot = await debugAllVinculos();
        
        if (allVinculosSnapshot.empty) {
            console.log(`No se encontraron vínculos en la base de datos`);
            return { deletedCount: 0 };
        }
        
        const userIds = [...new Set(allVinculosSnapshot.docs.map(doc => doc.data().userId))];
        const usersCollection = collection(db, 'usuarios');
        const usersQuery = query(usersCollection, where(documentId(), 'in', userIds));
        const usersSnapshot = await getDocs(usersQuery);
        
        const usersMap = {};
        usersSnapshot.docs.forEach(doc => {
            usersMap[doc.id] = doc.data();
        });
        
        const filteredVinculos = allVinculosSnapshot.docs.filter(doc => {
            const data = doc.data();
            const userData = usersMap[data.userId];
            const rolFromVinculo = data.rol;
            const rolFromUser = userData ? userData.rol : null;
            const matches = rolFromVinculo === role || rolFromUser === role;
            return matches;
        });
        
        if (filteredVinculos.length === 0) {
            console.log(`No se encontraron usuarios con rol: ${role}`);
            return { deletedCount: 0 };
        }
        
        const userIdsToDelete = [...new Set(filteredVinculos.map(doc => doc.data().userId))];
        const otherVinculosQuery = query(vinculosCollection, where('userId', 'in', userIdsToDelete));
        const otherVinculosSnapshot = await getDocs(otherVinculosQuery);
        
        const usersToDeleteIds = userIdsToDelete.filter(userId => {
            const userVinculos = otherVinculosSnapshot.docs.filter(doc => doc.data().userId === userId);
            if (userVinculos.length === 0) return true;
            return userVinculos.every(doc => {
                const data = doc.data();
                const userData = usersMap[data.userId];
                const rolFromVinculo = data.rol;
                const rolFromUser = userData ? userData.rol : null;
                return rolFromVinculo === role || rolFromUser === role;
            });
        });
        
        console.log(`Se eliminarán ${usersToDeleteIds.length} documentos de usuarios que solo tienen rol: ${role}`);
        
        const batch = writeBatch(db);
        filteredVinculos.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Se eliminaron ${filteredVinculos.length} vínculos de usuarios con rol: ${role}`);
        
        if (usersToDeleteIds.length > 0) {
            const usersBatch = writeBatch(db);
            usersToDeleteIds.forEach(userId => {
                const userRef = doc(db, 'usuarios', userId);
                usersBatch.delete(userRef);
            });
            await usersBatch.commit();
            console.log(`Se eliminaron ${usersToDeleteIds.length} documentos de usuarios con rol: ${role}`);
        }
        
        return { deletedCount: filteredVinculos.length };
    }, [debugAllVinculos]);

    // Crear datos de prueba
    const createTestData = useCallback(async () => {
        console.log("Iniciando creación de datos de prueba");
        
        try {
            const client1Data = { nombre: "Empresa Prueba Alpha", direccion: "Dirección Alpha 123", telefono: "+58 212-1234567" };
            const client2Data = { nombre: "Empresa Prueba Beta", direccion: "Dirección Beta 456", telefono: "+58 212-7654321" };
            const client1Ref = await addDoc(collection(db, 'clientes'), client1Data);
            const client2Ref = await addDoc(collection(db, 'clientes'), client2Data);
            console.log(`Creados clientes: ${client1Ref.id} y ${client2Ref.id}`);
            
            const zones1 = []; const zones2 = [];
            for (let i = 1; i <= 5; i++) {
                const zone1Ref = await addDoc(collection(db, 'zonas'), { nombre: `Zona Alpha ${i}`, clientId: client1Ref.id });
                const zone2Ref = await addDoc(collection(db, 'zonas'), { nombre: `Zona Beta ${i}`, clientId: client2Ref.id });
                zones1.push(zone1Ref.id); zones2.push(zone2Ref.id);
            }
            console.log(`Creadas zonas para los clientes`);
            
            for (let i = 1; i <= 10; i++) {
                const userData1 = { nombre: `Empleado Alpha ${i}`, correo: `empleado.alpha${i}@prueba.com`, telefono: `+58 414-100${i.toString().padStart(4, '0')}`, rol: 'empleado' };
                const userRef1 = await addDoc(collection(db, 'usuarios'), userData1);
                const randomZones1 = [...zones1].sort(() => 0.5 - Math.random()).slice(0, 2);
                await addDoc(collection(db, 'vinculos'), { userId: userRef1.id, clientId: client1Ref.id, rol: 'empleado', activo: true, zonasAsignadas: randomZones1, fechaCreacion: Timestamp.now() });
            }
            for (let i = 1; i <= 2; i++) {
                const userData1 = { nombre: `Conductor Alpha ${i}`, correo: `conductor.alpha${i}@prueba.com`, telefono: `+58 414-200${i.toString().padStart(4, '0')}`, rol: 'conductor' };
                const userRef1 = await addDoc(collection(db, 'usuarios'), userData1);
                await addDoc(collection(db, 'vinculos'), { userId: userRef1.id, clientId: client1Ref.id, rol: 'conductor', activo: true, zonasAsignadas: zones1, fechaCreacion: Timestamp.now() });
            }
            for (let i = 1; i <= 10; i++) {
                const userData2 = { nombre: `Empleado Beta ${i}`, correo: `empleado.beta${i}@prueba.com`, telefono: `+58 414-300${i.toString().padStart(4, '0')}`, rol: 'empleado' };
                const userRef2 = await addDoc(collection(db, 'usuarios'), userData2);
                const randomZones2 = [...zones2].sort(() => 0.5 - Math.random()).slice(0, 2);
                await addDoc(collection(db, 'vinculos'), { userId: userRef2.id, clientId: client2Ref.id, rol: 'empleado', activo: true, zonasAsignadas: randomZones2, fechaCreacion: Timestamp.now() });
            }
            
            console.log("Datos de prueba creados exitosamente");
            return { success: true };
            
        } catch (error) {
            console.error("Error al crear datos de prueba:", error);
            throw error;
        }
    }, []);

    // --- NUEVAS FUNCIONES PARA CONFIGURACIÓN GLOBAL ---
    const fetchGlobalConfig = useCallback(async () => {
        const configRef = doc(db, 'configuracion', 'global');
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
            return configSnap.data();
        }
        return { loginFooterText: '' };
    }, []);

    const updateGlobalConfig = useCallback(async (configData) => {
        const configRef = doc(db, 'configuracion', 'global');
        await setDoc(configRef, configData, { merge: true });
    }, []);

    // ====================================================================
    // CORRECCIÓN: NUEVAS FUNCIONES PARA GESTIÓN DE CIERRE INDIVIDUAL POR CONDUCTOR
    // ====================================================================
    
    // Obtener la hora de cierre para un conductor específico
    const getTodayClosingTimeForDriver = useCallback(async (clientId, driverId) => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            
            // CORRECCIÓN: Simplificar la consulta para evitar el error de índice
            const closingCollection = collection(db, 'cierres');
            
            // Primero buscar por clientId y fecha
            const q1 = query(
                closingCollection,
                where('clientId', '==', clientId),
                where('fecha', '>=', Timestamp.fromDate(today)),
                where('fecha', '<', Timestamp.fromDate(tomorrow))
            );
            
            const querySnapshot1 = await getDocs(q1);
            console.log(`getTodayClosingTimeForDriver: Se encontraron ${querySnapshot1.size} registros de cierre para la empresa ${clientId}`);
            
            // Luego filtrar por userId en el cliente
            const closingRecords = querySnapshot1.docs.filter(doc => doc.data().userId === driverId);
            console.log(`getTodayClosingTimeForDriver: Se encontraron ${closingRecords.length} registros para el conductor ${driverId}`);
            
            if (closingRecords.length > 0) {
                const doc = closingRecords[0];
                console.log(`getTodayClosingTimeForDriver: Hora de cierre encontrada: ${doc.data().horaCierre}`);
                return doc.data().horaCierre;
            }
            return null;
        } catch (error) {
            console.error("Error al obtener la hora de cierre del conductor:", error);
            return null;
        }
    }, []);

    // Establecer la hora de cierre para un conductor específico
    const setClosingTimeForDriver = useCallback(async (clientId, driverId, time, registeredBy, registeredByName) => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            
            // CORRECCIÓN: Usar la colección 'cierres' en lugar de 'closingTimes'
            const closingCollection = collection(db, 'cierres');
            
            // Verificar si ya existe un registro para hoy
            const q = query(
                closingCollection,
                where('clientId', '==', clientId),
                where('fecha', '>=', Timestamp.fromDate(today)),
                where('fecha', '<', Timestamp.fromDate(tomorrow))
            );
            
            const querySnapshot = await getDocs(q);
            
            const closingData = { 
                clientId: clientId, 
                horaCierre: time, 
                userId: driverId, 
                userName: registeredByName, 
                fecha: Timestamp.now() 
            };
            
            if (querySnapshot.empty) {
                await addDoc(closingCollection, closingData);
            } else {
                await updateDoc(doc(db, 'cierres', querySnapshot.docs[0].id), closingData);
            }
            
            return true;
        } catch (error) {
            console.error("Error al establecer la hora de cierre del conductor:", error);
            return false;
        }
    }, []);

    // CORRECCIÓN: Función para limpiar la hora de cierre de un conductor específico
    const clearTodayClosingTimeForDriver = useCallback(async (clientId, driverId) => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            
            // CORRECCIÓN: Usar la colección 'cierres' en lugar de 'closingTimes'
            const closingCollection = collection(db, 'cierres');
            
            const q = query(
                closingCollection,
                where('clientId', '==', clientId),
                where('fecha', '>=', Timestamp.fromDate(today)),
                where('fecha', '<', Timestamp.fromDate(tomorrow))
            );
            
            const querySnapshot = await getDocs(q);
            
            // Filtrar por userId en el cliente
            const closingRecords = querySnapshot.docs.filter(doc => doc.data().userId === driverId);
            
            if (closingRecords.length > 0) {
                const docRef = closingRecords[0].ref;
                await deleteDoc(docRef);
                console.log(`Hora de cierre del conductor ${driverId} para hoy ha sido eliminada.`);
                
                // CORRECCIÓN: También eliminar cualquier registro de cierre de la empresa
                // para asegurar que no quede ninguna hora de cierre residual
                const companyClosingRecords = querySnapshot.docs.filter(doc => 
                    !doc.data().userId || doc.data().isCompanyWide
                );
                
                if (companyClosingRecords.length > 0) {
                    for (const record of companyClosingRecords) {
                        await deleteDoc(record.ref);
                        console.log(`Registro de cierre de empresa eliminado para evitar conflictos.`);
                    }
                }
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error("Error al limpiar la hora de cierre del conductor:", error);
            return false;
        }
    }, []);

    // CORRECCIÓN: Función para limpiar todas las horas de cierre del día
    const clearAllClosingTimesForToday = useCallback(async (clientId) => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            
            const closingCollection = collection(db, 'cierres');
            
            const q = query(
                closingCollection,
                where('clientId', '==', clientId),
                where('fecha', '>=', Timestamp.fromDate(today)),
                where('fecha', '<', Timestamp.fromDate(tomorrow))
            );
            
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                console.log("No se encontraron registros de cierre para hoy");
                return false;
            }
            
            // Eliminar todos los registros de cierre del día
            const batch = writeBatch(db);
            querySnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            console.log(`Se han eliminado ${querySnapshot.size} registros de cierre para hoy`);
            
            return true;
        } catch (error) {
            console.error("Error al limpiar todas las horas de cierre del día:", error);
            return false;
        }
    }, []);

    // CORRECCIÓN: Función para marcar la jornada de un conductor como finalizada
    const markDriverWorkdayAsCompleted = useCallback(async (clientId, driverId) => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            
            // CORRECCIÓN: Usar la colección 'cierres' en lugar de 'closingTimes'
            const closingCollection = collection(db, 'cierres');
            
            const q = query(
                closingCollection,
                where('clientId', '==', clientId),
                where('fecha', '>=', Timestamp.fromDate(today)),
                where('fecha', '<', Timestamp.fromDate(tomorrow))
            );
            
            const querySnapshot = await getDocs(q);
            
            // Filtrar por userId en el cliente
            const closingRecords = querySnapshot.docs.filter(doc => doc.data().userId === driverId);
            
            if (closingRecords.length > 0) {
                const docRef = closingRecords[0].ref;
                await updateDoc(docRef, {
                    jornadaFinalizada: true
                });
            }
            
            return true;
        } catch (error) {
            console.error("Error al marcar la jornada como finalizada:", error);
            return false;
        }
    }, []);

    // --- FUNCIONES LEGADO (MANTENIDAS PARA COMPATIBILIDAD) ---
    const setClosingTime = useCallback(async (clientId, closingTime, userId, userName) => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        const closingCollection = collection(db, 'cierres');
        const q = query(closingCollection, where('clientId', '==', clientId), where('fecha', '>=', Timestamp.fromDate(today)), where('fecha', '<', Timestamp.fromDate(tomorrow)));
        const querySnapshot = await getDocs(q);
        const closingData = { clientId: clientId, horaCierre: closingTime, userId: userId, userName: userName, fecha: Timestamp.now() };
        if (querySnapshot.empty) {
            await addDoc(closingCollection, closingData);
        } else {
            await updateDoc(doc(db, 'cierres', querySnapshot.docs[0].id), closingData);
        }
    }, []);

    const getTodayClosingTime = useCallback(async (clientId) => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        const closingCollection = collection(db, 'cierres');
        const q = query(closingCollection, where('clientId', '==', clientId), where('fecha', '>=', Timestamp.fromDate(today)), where('fecha', '<', Timestamp.fromDate(tomorrow)), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const data = querySnapshot.docs[0].data();
            return data.horaCierre;
        }
        return null;
    }, []);

    const clearTodayClosingTime = useCallback(async (clientId) => {
        if (!clientId) return;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        const closingCollection = collection(db, 'cierres');
        const q = query(closingCollection, where('clientId', '==', clientId), where('fecha', '>=', Timestamp.fromDate(today)), where('fecha', '<', Timestamp.fromDate(tomorrow)));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const docId = querySnapshot.docs[0].id;
            const docRef = doc(db, 'cierres', docId);
            await deleteDoc(docRef);
            console.log(`Hora de cierre para hoy (clientId: ${clientId}) ha sido eliminada.`);
        }
    }, []);

    const setClosingPerson = useCallback(async (clientId, vinculoId) => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        const vinculosCollection = collection(db, 'vinculos');
        const qVinculos = query(vinculosCollection, where('clientId', '==', clientId), where('esEncargadoCierre', '==', true));
        const vinculosSnapshot = await getDocs(qVinculos);
        const batch = writeBatch(db);
        vinculosSnapshot.forEach(doc => { batch.update(doc.ref, { esEncargadoCierre: false }); });
        const newClosingPersonRef = doc(db, 'vinculos', vinculoId);
        batch.update(newClosingPersonRef, { esEncargadoCierre: true });
        await batch.commit();
        
        const closingCollection = collection(db, 'cierres');
        const q = query(closingCollection, where('clientId', '==', clientId), where('fecha', '>=', Timestamp.fromDate(today)), where('fecha', '<', Timestamp.fromDate(tomorrow)));
        const querySnapshot = await getDocs(q);
        const vinculoDoc = await getDoc(newClosingPersonRef);
        const vinculoData = vinculoDoc.data();
        const userDoc = await getDoc(doc(db, 'usuarios', vinculoData.userId));
        const userData = userDoc.data();
        const closingData = { clientId: clientId, vinculoId: vinculoId, userId: vinculoData.userId, userName: userData.nombre, fecha: Timestamp.now() };
        if (querySnapshot.empty) {
            await addDoc(closingCollection, closingData);
        } else {
            await updateDoc(doc(db, 'cierres', querySnapshot.docs[0].id), closingData);
        }
    }, []);

    const getTodayClosingPerson = useCallback(async (clientId) => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        const closingCollection = collection(db, 'cierres');
        const q = query(closingCollection, where('clientId', '==', clientId), where('fecha', '>=', Timestamp.fromDate(today)), where('fecha', '<', Timestamp.fromDate(tomorrow)), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const data = querySnapshot.docs[0].data();
            return { userId: data.userId, nombre: data.userName, vinculoId: data.vinculoId };
        }
        return null;
    }, []);

    // ====================================================================
    // CORRECCIÓN: NUEVAS FUNCIONES PARA SINCRONIZACIÓN DE CIERRES EN TIEMPO REAL
    // ====================================================================
    
    // Función para notificar cambios en las horas de cierre
    const notifyClosingTimeChange = useCallback(async (clientId, driverId, newClosingTime) => {
        try {
            // Crear un documento en una colección de notificaciones
            const notificationsRef = collection(db, 'clientes', clientId, 'notificaciones');
            await addDoc(notificationsRef, {
                type: 'closingTimeChange',
                driverId,
                newClosingTime,
                timestamp: Timestamp.now()
            });
            console.log(`Notificación de cambio de hora de cierre creada para el conductor ${driverId}`);
        } catch (error) {
            console.error('Error al notificar cambio de hora de cierre:', error);
        }
    }, []);

    // Función para escuchar cambios en las horas de cierre
    const listenToClosingTimeChanges = useCallback((clientId, callback) => {
        if (!clientId) return () => {};
        
        // CORRECCIÓN: Simplificar la consulta para evitar el error de índice
        // Usamos una consulta más simple sin ordenamiento para evitar problemas de índice
        const notificationsRef = collection(db, 'clientes', clientId, 'notificaciones');
        const q = query(
            notificationsRef,
            where('type', '==', 'closingTimeChange'),
            limit(10)
        );
        
        return onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const notification = change.doc.data();
                    callback(notification);
                }
            });
        });
    }, []);

    // ====================================================================
    // CORRECCIÓN IMPORTANTE: Función para obtener tanto la hora de cierre del conductor como la de la empresa
    // ====================================================================
    const getTodayClosingTimes = useCallback(async (clientId, driverId) => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            
            const closingCollection = collection(db, 'cierres');
            
            // Buscar todos los cierres para hoy
            const q = query(
                closingCollection,
                where('clientId', '==', clientId),
                where('fecha', '>=', Timestamp.fromDate(today)),
                where('fecha', '<', Timestamp.fromDate(tomorrow))
            );
            
            const querySnapshot = await getDocs(q);
            console.log(`getTodayClosingTimes: Se encontraron ${querySnapshot.size} registros de cierre para la empresa ${clientId}`);
            
            // CORRECCIÓN: Registrar todos los documentos encontrados para depuración
            for (const docSnapshot of querySnapshot.docs) {
                const data = docSnapshot.data();
                console.log(`Registro de cierre encontrado:`, {
                    id: docSnapshot.id,
                    userId: data.userId,
                    horaCierre: data.horaCierre,
                    isCompanyWide: data.isCompanyWide || false
                });
            }
            
            // Buscar cierre específico del conductor y cierre de la empresa
            let driverClosingTime = null;
            let companyClosingTime = null;
            
            // CORRECCIÓN: Obtener información del usuario para determinar si es un empleado o conductor
            const userDoc = await getDoc(doc(db, 'usuarios', driverId));
            const userData = userDoc.exists() ? userDoc.data() : null;
            const userRole = userData ? userData.rol : null;
            
            console.log(`Información del usuario:`, {
                userId: driverId,
                userRole: userRole
            });
            
            // CORRECCIÓN: Usar for...of en lugar de forEach para poder usar await
            for (const queryDocSnapshot of querySnapshot.docs) {
                const data = queryDocSnapshot.data();
                
                // Si el registro coincide con el ID del conductor
                if (data.userId === driverId) {
                    driverClosingTime = data.horaCierre;
                    console.log(`Hora de cierre del conductor encontrada: ${data.horaCierre}`);
                }
                
                // CORRECCIÓN: Considerar como cierre de empresa cualquier registro que:
                // 1. No tenga userId
                // 2. Tenga isCompanyWide como true
                // 3. Pertenenezca a un usuario con rol 'empleado' (el encargado de cierre)
                if (!data.userId || data.isCompanyWide === true) {
                    companyClosingTime = data.horaCierre;
                    console.log(`Hora de cierre de la empresa encontrada (criterio 1 o 2): ${data.horaCierre}`);
                } else if (data.userId && data.userId !== driverId) {
                    // Verificar si el userId pertenece a un empleado
                    try {
                        const closingUserDoc = await getDoc(doc(db, 'usuarios', data.userId));
                        if (closingUserDoc.exists()) {
                            const closingUserData = closingUserDoc.data();
                            if (closingUserData.rol === 'empleado') {
                                companyClosingTime = data.horaCierre;
                                console.log(`Hora de cierre de la empresa encontrada (criterio 3 - empleado): ${data.horaCierre}`);
                            }
                        }
                    } catch (error) {
                        console.error("Error al verificar el rol del usuario de cierre:", error);
                    }
                }
            }
            
            // Devolver tanto el cierre del conductor como el de la empresa
            return {
                driverClosingTime,
                companyClosingTime,
                hasAnyClosingTime: !!(driverClosingTime || companyClosingTime)
            };
        } catch (error) {
            console.error('Error al obtener horas de cierre:', error);
            return {
                driverClosingTime: null,
                companyClosingTime: null,
                hasAnyClosingTime: false
            };
        }
    }, []);

    // ====================================================================
    // CORRECCIÓN CRÍTICA: NUEVAS FUNCIONES PARA DISTRIBUIR HORA DE CIERRE A CONDUCTORES
    // ====================================================================
    
    // Función para distribuir la hora de cierre a todos los conductores con empleados disponibles
    const distributeClosingTimeToDrivers = useCallback(async (clientId, closingTime, currentUser) => {
        try {
            // CORRECCIÓN: Verificar que currentUser existe y tiene uid
            if (!currentUser || !currentUser.uid) {
                console.error('Error: currentUser no está definido o no tiene uid');
                return false;
            }

            // Obtener todos los usuarios de la empresa
            const users = await fetchUsersByClient(clientId);
            
            // Filtrar solo los conductores
            const drivers = users.filter(user => user.userData.rol === 'conductor');
            
            // Para cada conductor, verificar si tiene empleados disponibles hoy
            const todayAsistencias = await fetchTodayAsistencias(clientId);
            
            for (const driver of drivers) {
                // CORRECCIÓN: Verificar que driver tiene userId
                if (!driver.userId) {
                    console.warn('Conductor sin userId encontrado, saltando...');
                    continue;
                }

                // Verificar si el conductor tiene zonas asignadas
                if (!driver.zonasAsignadas || driver.zonasAsignadas.length === 0) {
                    continue;
                }
                
                // Filtrar empleados que están en las zonas del conductor
                const availableEmployees = todayAsistencias.filter(asistencia => {
                    return driver.zonasAsignadas.includes(asistencia.zona) && 
                           !asistencia.completado;
                });
                
                // Si el conductor tiene empleados disponibles, asignarle la hora de cierre
                if (availableEmployees.length > 0) {
                    await setClosingTimeForDriver(
                        clientId, 
                        driver.userId, 
                        closingTime, 
                        currentUser.uid, 
                        currentUser.nombre || 'Usuario desconocido'
                    );
                    console.log(`Hora de cierre ${closingTime} asignada al conductor ${driver.userData.nombre}`);
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error al distribuir la hora de cierre a los conductores:', error);
            return false;
        }
    }, [fetchUsersByClient, fetchTodayAsistencias, setClosingTimeForDriver]);

    // ====================================================================
    // CORRECCIÓN: NUEVA FUNCIÓN PARA VERIFICAR CONDUCTORES CON EMPLEADOS PENDIENTES
    // ====================================================================
    
    // Función para obtener conductores que todavía tienen empleados pendientes
    const fetchDriversWithPendingEmployees = useCallback(async (clientId, currentDriverId) => {
        try {
            // Obtener todos los usuarios de la empresa
            const users = await fetchUsersByClient(clientId);
            
            // Filtrar solo los conductores (excluyendo al conductor actual)
            const drivers = users.filter(user => 
                user.userData.rol === 'conductor' && user.userId !== currentDriverId
            );
            
            // Obtener las asistencias de hoy
            const todayAsistencias = await fetchTodayAsistencias(clientId);
            
            // Array para almacenar los conductores con empleados pendientes
            const driversWithPending = [];
            
            // Para cada conductor, verificar si tiene empleados pendientes
            for (const driver of drivers) {
                // Verificar si el conductor tiene zonas asignadas
                if (!driver.zonasAsignadas || driver.zonasAsignadas.length === 0) {
                    continue;
                }
                
                // Filtrar empleados que están en las zonas del conductor y no han sido completados
                const pendingEmployees = todayAsistencias.filter(asistencia => {
                    return driver.zonasAsignadas.includes(asistencia.zona) && 
                           !asistencia.completado;
                });
                
                // Si el conductor tiene empleados pendientes, añadirlo al array
                if (pendingEmployees.length > 0) {
                    driversWithPending.push({
                        driverId: driver.userId,
                        driverName: driver.userData.nombre,
                        pendingCount: pendingEmployees.length
                    });
                }
            }
            
            console.log(`Conductores con empleados pendientes: ${driversWithPending.length}`);
            driversWithPending.forEach(driver => {
                console.log(`- ${driver.driverName}: ${driver.pendingCount} empleados pendientes`);
            });
            
            return driversWithPending;
        } catch (error) {
            console.error('Error al verificar conductores con empleados pendientes:', error);
            return [];
        }
    }, [fetchUsersByClient, fetchTodayAsistencias]);

    // ====================================================================
    // NUEVA FUNCIÓN PARA OBTENER CONDUCTORES POR ZONA
    // ====================================================================
    const fetchDriversByZone = useCallback(async (clientId, zoneId) => {
        if (!clientId || !zoneId) return [];
        console.log(`[fetchDriversByZone] Buscando conductores para clientId: ${clientId}, zoneId: ${zoneId}`);

        try {
            const vinculosCollection = collection(db, 'vinculos');
            const q = query(
                vinculosCollection,
                where('clientId', '==', clientId),
                where('rol', '==', 'conductor'),
                where('activo', '==', true)
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.log(`[fetchDriversByZone] No se encontraron conductores activos para la empresa ${clientId}`);
                return [];
            }

            const driverIds = querySnapshot.docs
                .map(doc => doc.data())
                .filter(vinculo => vinculo.zonasAsignadas && vinculo.zonasAsignadas.includes(zoneId))
                .map(vinculo => vinculo.userId);

            console.log(`[fetchDriversByZone] Se encontraron ${driverIds.length} conductores para la zona ${zoneId}:`, driverIds);
            return driverIds;

        } catch (error) {
            console.error("Error en fetchDriversByZone:", error);
            return [];
        }
    }, []);

    return {
        fetchUsers, updateUser,
        fetchUserByEmail,
        fetchUsersByClient,
        fetchUserVinculos, updateUserVinculo, deactivateUserVinculo,
        createVinculo,
        fetchClients, addClient, updateClient, deleteClient,
        fetchZones, addZone, updateZone, deleteZone,
        addTrip,
        fetchTodayAsistencias, setOrUpdateAsistencia, fetchMyAsistenciaForToday,
        markAsistenciaAsCompleted,
        // Nuevas funciones
        deleteUsersByRole,
        createTestData,
        fetchGlobalConfig,
        updateGlobalConfig,
        // Funciones para gestión de cierre
        setClosingTime,
        getTodayClosingTime,
        clearTodayClosingTime,
        setClosingPerson,
        getTodayClosingPerson,
        // ====================================================================
        // CORRECCIÓN: Exportar las nuevas funciones para gestión individual por conductor
        // ====================================================================
        getTodayClosingTimeForDriver,
        setClosingTimeForDriver,
        clearTodayClosingTimeForDriver,
        clearAllClosingTimesForToday,
        markDriverWorkdayAsCompleted,
        deleteEmployeeAttendanceForToday,
        // ====================================================================
        // CORRECCIÓN: NUEVAS FUNCIONES PARA SINCRONIZACIÓN DE CIERRES EN TIEMPO REAL
        // ====================================================================
        notifyClosingTimeChange,
        listenToClosingTimeChanges,
        getTodayClosingTimes,
        // ====================================================================
        // CORRECCIÓN: NUEVAS FUNCIONES PARA DISTRIBUIR HORA DE CIERRE A CONDUCTORES
        // ====================================================================
        distributeClosingTimeToDrivers,
        // ====================================================================
        fetchDriversWithPendingEmployees,
        // ====================================================================
        // NUEVA FUNCIÓN PARA NOTIFICACIONES
        // ====================================================================
        fetchDriversByZone
    };
};

// CORRECCIÓN: Removed the function call () from the export to fix "Invalid hook call" error
export default useFirestore;