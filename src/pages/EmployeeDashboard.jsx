// src/pages/EmployeeDashboard.jsx

import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, List, ListItem, Alert, Button, CircularProgress, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { HowToReg as HowToRegIcon, CheckCircle as CheckCircleIcon, AccessTime as AccessTimeIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useFirestore } from '../hooks/useFirestore';
import { useAuthStore } from '../store/authStore';

export default function EmployeeDashboard() {
    const navigate = useNavigate();
    const { user, selectedClientId } = useAuthStore();
    const { 
        fetchUserVinculos, 
        fetchZones, 
        setOrUpdateAsistencia, 
        fetchMyAsistenciaForToday, 
        setClosingTimeForDriver, 
        getTodayClosingTimeForDriver, 
        notifyClosingTimeChange, 
        distributeClosingTimeToDrivers, 
        clearAllClosingTimesForToday,
        fetchDriversByZone // NUEVA FUNCIÓN IMPORTADA
    } = useFirestore();
    
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [myAsistencia, setMyAsistencia] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [vinculos, setVinculos] = useState([]);
    const [isClosingPerson, setIsClosingPerson] = useState(false);
    const [closingTimeValue, setClosingTimeValue] = useState(''); // Siempre inicia vacío
    const [closingTimeDialog, setClosingTimeDialog] = useState(false);
    const [todayClosingTime, setTodayClosingTime] = useState(null);
    const [mustRegisterClosingTime, setMustRegisterClosingTime] = useState(false);
    const [selectedZone, setSelectedZone] = useState(null);
    const [initialized, setInitialized] = useState(false); // Nuevo estado para controlar inicialización

    // --- NUEVA FUNCIÓN PARA ENVIAR NOTIFICACIONES DE ASISTENCIA REGISTRADA (CORREGIDA) ---
    const sendAttendanceNotificationToDrivers = async (zoneId, zoneName) => {
        console.log(`Enviando notificación de asistencia a conductores de la zona ${zoneName}...`);
        
        const notificationPayload = {
            title: 'Nuevo Registro de Asistencia',
            body: `El empleado ${user.nombre} ha registrado su asistencia en la zona: ${zoneName}.`,
            icon: '/erick-go-logo.png',
            data: {
                url: '/conductor-dashboard' // URL a la que se abrirá al hacer clic
            }
        };

        try {
            // 1. Obtener los IDs de los conductores asignados a esta zona
            const driverIds = await fetchDriversByZone(selectedClientId, zoneId);

            // 2. FILTRAR para asegurar que solo queden IDs de cadenas de texto válidas
            const validDriverIds = driverIds.filter(id => id && typeof id === 'string');

            if (validDriverIds.length === 0) {
                console.log(`No hay conductores válidos asignados a la zona ${zoneName}. No se envían notificaciones.`);
                return;
            }

            // 3. Enviar la notificación usando el array de IDs
            const response = await fetch('/.netlify/functions/send-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userIds: validDriverIds, // <-- CORRECCIÓN: Usar userIds (plural) con un array
                    payload: notificationPayload,
                }),
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            console.log(`Notificaciones de asistencia enviadas exitosamente a ${validDriverIds.length} conductores.`);
        } catch (error) {
            console.error('Error al enviar una o más notificaciones de asistencia:', error);
        }
    };

    // Función para convertir hora de formato 24h a 12h con AM/PM
    const formatTime12Hour = (time24) => {
        if (!time24) return '';
        
        // Si el formato ya incluye AM/PM, devolverlo tal cual
        if (time24.includes('AM') || time24.includes('PM')) {
            return time24;
        }
        
        // Dividir la hora y los minutos
        const [hours, minutes] = time24.split(':');
        
        // Convertir a número
        const hour = parseInt(hours, 10);
        
        // Determinar AM o PM
        const period = hour >= 12 ? 'PM' : 'AM';
        
        // Convertir a formato 12 horas
        const hour12 = hour % 12 || 12; // El operador || convierte 0 a 12
        
        // Formatear con ceros a la izquierda si es necesario
        return `${hour12.toString().padStart(2, '0')}:${minutes} ${period}`;
    };

    // EFECTO 1: Inicialización y manejo de empresa
    useEffect(() => {
        if (!user || initialized) {
            setLoading(false);
            return;
        }

        const initializeDashboard = async () => {
            console.log("=== EmployeeDashboard: INICIALIZANDO ===");
            console.log("Usuario logueado:", user.uid);
            console.log("Empresa seleccionada al iniciar:", selectedClientId);
            setLoading(true);

            try {
                const userVinculos = await fetchUserVinculos(user.uid);
                console.log("Vínculos obtenidos de BD:", userVinculos);
                setVinculos(userVinculos);

                let targetClientId = selectedClientId;

                if (!targetClientId) {
                    if (userVinculos.length === 1) {
                        targetClientId = userVinculos[0].clientId;
                        console.log("Auto-seleccionando la única empresa:", targetClientId);
                        useAuthStore.getState().setSelectedClient(targetClientId);
                    } else if (userVinculos.length > 1) {
                        console.log("Múltiples empresas y sin selección. Redirigiendo...");
                        navigate('/select-company');
                        setLoading(false);
                        return;
                    }
                }

                if (targetClientId) {
                    console.log("Empresa a cargar:", targetClientId);
                    // Verificar si este usuario es el encargado de cerrar hoy
                    const currentVinculo = userVinculos.find(v => v.clientId === targetClientId);
                    if (currentVinculo && currentVinculo.esEncargadoCierre) {
                        setIsClosingPerson(true);
                        // Siempre requerir registro de hora de cierre para el encargado
                        setMustRegisterClosingTime(true);
                        setTodayClosingTime(null); // Resetear la hora de cierre
                        
                        // CAMBIO: No cargar la hora de cierre anterior al inicializar
                        // Solo la cargaremos cuando el usuario la solicite explícitamente
                        console.log("Usuario es encargado de cierre, pero no se carga hora anterior");
                    }
                }

            } catch (error) {
                console.error("EmployeeDashboard: Error durante la inicialización:", error);
            } finally {
                setLoading(false);
                setInitialized(true); // Marcar como inicializado
            }
        };

        initializeDashboard();
    }, [user, navigate, fetchUserVinculos, getTodayClosingTimeForDriver, initialized]);

    // EFECTO 2: Carga de datos específicos de la empresa
    useEffect(() => {
        console.log("=== EmployeeDashboard: EFECTO DE CARGA DE DATOS ===");
        console.log("Detectado cambio en selectedClientId a:", selectedClientId);
        
        if (!selectedClientId) {
            console.log("No hay selectedClientId. Limpiando zonas y asistencia.");
            setZones([]);
            setMyAsistencia(null);
            return;
        }

        const loadCompanyData = async () => {
            console.log("Iniciando carga de datos para la empresa:", selectedClientId);
            setLoading(true);
            try {
                const zonesData = await fetchZones(selectedClientId);
                console.log("Zonas recibidas de fetchZones:", zonesData);
                setZones(zonesData);
                console.log("Estado 'zones' actualizado con las nuevas zonas.");

                const asistencia = await fetchMyAsistenciaForToday(user.uid);
                setMyAsistencia(asistencia);
                console.log("Asistencia de hoy cargada.");
                
                // CAMBIO: No cargar automáticamente la hora de cierre al cargar datos de la empresa
                // Solo la cargaremos cuando el usuario la solicite explícitamente
                console.log("No se carga automáticamente la hora de cierre al cargar datos de la empresa");
                
            } catch (error) {
                console.error("EmployeeDashboard: Error al cargar datos de la empresa:", error);
            } finally {
                setLoading(false);
            }
        };
        
        loadCompanyData();

    }, [selectedClientId, fetchZones, fetchMyAsistenciaForToday, isClosingPerson, getTodayClosingTimeForDriver]);

    const handleCheckInOrChange = async (zoneId) => {
        try {
            if (!user?.uid || !selectedClientId) {
                throw new Error("Faltan datos del usuario o de la empresa.");
            }
            
            // Si es el encargado de cierre y no ha registrado la hora de cierre, mostrar diálogo
            if (isClosingPerson && mustRegisterClosingTime) {
                setSelectedZone(zoneId); // Guardar la zona seleccionada
                setClosingTimeDialog(true);
                return;
            }
            
            const selectedZoneObj = zones.find(z => z.id === zoneId);
            const zoneName = selectedZoneObj ? selectedZoneObj.nombre : 'Zona desconocida';

            await setOrUpdateAsistencia(user.uid, zoneId, user.nombre, selectedClientId);
            
            setMyAsistencia({ zona: zoneId });
            setSuccessMessage(`¡Tu asistencia ha sido registrada en: ${zoneName}!`);
            setTimeout(() => setSuccessMessage(''), 5000);

            // --- NUEVO: ENVIAR NOTIFICACIÓN A LOS CONDUCTORES ---
            console.log(">>> Enviando notificación a los conductores de la zona...");
            await sendAttendanceNotificationToDrivers(zoneId, zoneName);
            console.log(">>> Notificación enviada.");

        } catch (error) {
            console.error("Error al registrar la asistencia:", error);
            alert("Hubo un error al guardar tu zona. Por favor, intenta de nuevo.");
        }
    };

    const handleSetClosingTime = async () => {
        try {
            console.log("handleSetClosingTime called with:", {
                user: user?.uid,
                selectedClientId: selectedClientId,
                closingTimeValue: closingTimeValue
            });
            
            if (!user?.uid || !selectedClientId || !closingTimeValue) {
                console.error("Faltan datos para registrar la hora de cierre:", {
                    user: user?.uid,
                    selectedClientId: selectedClientId,
                    closingTimeValue: closingTimeValue
                });
                throw new Error("Faltan datos para registrar la hora de cierre.");
            }
            
            // FIX: 'user' ya es el uid, así que lo pasamos directamente.
            await setClosingTimeForDriver(selectedClientId, user, closingTimeValue, user, user.nombre);
            
            // CAMBIO: Actualizar el estado inmediatamente después de guardar
            console.log("Actualizando estado todayClosingTime con:", closingTimeValue);
            setTodayClosingTime(closingTimeValue);
            setMustRegisterClosingTime(false);
            setClosingTimeDialog(false);
            setSuccessMessage(`¡Hora de cierre registrada: ${formatTime12Hour(closingTimeValue)}!`);
            setTimeout(() => setSuccessMessage(''), 5000);
            
            // CAMBIO: Distribuir la hora de cierre a todos los conductores con empleados disponibles
            // FIX: Pasamos 'user' que es el uid.
            await distributeClosingTimeToDrivers(selectedClientId, closingTimeValue, user);
            
            // Después de registrar la hora de cierre, registrar la asistencia si ya se había seleccionado una zona
            if (selectedZone) {
                await setOrUpdateAsistencia(user, selectedZone, user.nombre, selectedClientId);
                setMyAsistencia({ zona: selectedZone });
                const selectedZoneObj = zones.find(z => z.id === selectedZone);
                const zoneName = selectedZoneObj ? selectedZoneObj.nombre : 'Zona desconocida';
                setSuccessMessage(`¡Hora de cierre registrada y asistencia en: ${zoneName}!`);
                setTimeout(() => setSuccessMessage(''), 5000);
            }

        } catch (error) {
            console.error("Error al registrar la hora de cierre:", error);
            alert("Hubo un error al registrar la hora de cierre. Por favor, intenta de nuevo.");
        }
    };

    const handleCloseClosingTimeDialog = () => {
        setClosingTimeDialog(false);
        // No limpiamos el valor al cerrar el diálogo para mantener la hora si ya estaba registrada
        // setClosingTimeValue(''); 
        
        // Si el usuario cierra el diálogo sin registrar la hora, mostramos una advertencia
        if (isClosingPerson && mustRegisterClosingTime) {
            alert("Como encargado de cierre, debes registrar la hora de cierre antes de continuar.");
        }
    };

    // CAMBIO: Nueva función para cargar la hora de cierre existente cuando el usuario lo solicita
    const handleLoadExistingClosingTime = async () => {
        try {
            if (!user?.uid || !selectedClientId) {
                console.error("Faltan datos para cargar la hora de cierre existente");
                return;
            }
            
            const closing = await getTodayClosingTimeForDriver(selectedClientId, user.uid);
            if (closing) {
                console.log("Hora de cierre existente cargada:", closing);
                setClosingTimeValue(closing);
                setTodayClosingTime(closing);
                setMustRegisterClosingTime(false);
            } else {
                console.log("No se encontró hora de cierre existente para hoy");
                setClosingTimeValue('');
                setTodayClosingTime(null);
                setMustRegisterClosingTime(true);
            }
        } catch (error) {
            console.error("Error al cargar la hora de cierre existente:", error);
        }
    };

    // CAMBIO: Nueva función para limpiar todas las horas de cierre del día
    const handleClearAllClosingTimes = async () => {
        try {
            if (!selectedClientId) {
                console.error("Faltan datos para limpiar las horas de cierre");
                return;
            }
            
            await clearAllClosingTimesForToday(selectedClientId);
            console.log("Todas las horas de cierre del día han sido eliminadas");
            setClosingTimeValue('');
            setTodayClosingTime(null);
            setMustRegisterClosingTime(true);
            setSuccessMessage("Todas las horas de cierre del día han sido eliminadas");
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error("Error al limpiar las horas de cierre:", error);
            alert("Hubo un error al limpiar las horas de cierre. Por favor, intenta de nuevo.");
        }
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
    }

    if (vinculos.length === 0) {
        return (
            <Box sx={{ width: '100%' }}>
                <Alert severity="error">
                    No tienes empresas asignadas. Por favor, contacte al administrador.
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%' }}>
            <Typography variant="h4" gutterBottom>Panel del Empleado - Erick Go</Typography>
            
            {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

            <Paper sx={{ p: 3, mt: 2 }}>
                <Typography variant="h6">Hola, {user?.nombre || 'Colaborador'}!</Typography>
                
                {/* Sección para el encargado de cerrar */}
                {isClosingPerson && (
                    <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                            <AccessTimeIcon sx={{ mr: 1 }} />
                            Eres el encargado de cerrar hoy
                        </Typography>
                        
                        {mustRegisterClosingTime ? (
                            <Alert severity="warning" sx={{ mt: 2 }}>
                                Debes registrar la hora de cierre del local para poder continuar.
                            </Alert>
                        ) : (
                            <Alert severity="success" sx={{ mt: 2 }}>
                                Hora de cierre registrada para hoy: {formatTime12Hour(todayClosingTime)}
                                <Button 
                                    variant="text" 
                                    size="small" 
                                    sx={{ ml: 1 }}
                                    onClick={() => {
                                        setMustRegisterClosingTime(true);
                                        setClosingTimeDialog(true);
                                    }}
                                >
                                    Cambiar
                                </Button>
                            </Alert>
                        )}
                        
                        {mustRegisterClosingTime && (
                            <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Button 
                                    variant="contained" 
                                    color="warning" 
                                    startIcon={<AccessTimeIcon />}
                                    onClick={() => setClosingTimeDialog(true)}
                                >
                                    Registrar Hora de Cierre
                                </Button>
                                
                                {/* CAMBIO: Botón para cargar hora de cierre existente */}
                                <Button 
                                    variant="outlined" 
                                    color="primary"
                                    onClick={handleLoadExistingClosingTime}
                                >
                                    Usar Hora de Cierre Anterior
                                </Button>
                                
                                {/* CAMBIO: Botón para limpiar todas las horas de cierre del día */}
                                <Button 
                                    variant="outlined" 
                                    color="error"
                                    onClick={handleClearAllClosingTimes}
                                >
                                    Limpiar Todas las Horas de Cierre
                                </Button>
                            </Box>
                        )}
                    </Box>
                )}
                
                <Typography variant="body1" sx={{ mt: 2 }}>
                    Selecciona tu zona de destino para registrar tu asistencia diaria.
                </Typography>
                
                {zones.length > 0 ? (
                    <List sx={{ mt: 2 }}>
                        {zones.map((zone) => {
                            const isSelected = myAsistencia && myAsistencia.zona === zone.id && !myAsistencia.completado;
                            return (
                                <ListItem key={zone.id} disablePadding>
                                    <Button 
                                        variant={isSelected ? "contained" : "outlined"}
                                        color={isSelected ? "success" : "primary"}
                                        fullWidth
                                        startIcon={isSelected ? <CheckCircleIcon /> : <HowToRegIcon />}
                                        onClick={() => handleCheckInOrChange(zone.id)}
                                        sx={{ justifyContent: 'flex-start', p: 2, m: 0.5 }}
                                    >
                                        {isSelected ? `Seleccionado: ${zone.nombre}` : `Registrar en: ${zone.nombre}`}
                                    </Button>
                                </ListItem>
                            );
                        })}
                    </List>
                ) : (
                    <Alert severity="info" sx={{ mt: 2 }}>
                        No hay zonas registradas para esta empresa. Contacte al administrador.
                    </Alert>
                )}
                
                {myAsistencia && myAsistencia.completado && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                        ¡Tu viaje de hoy ha sido completado! Gracias por tu asistencia.
                    </Alert>
                )}
            </Paper>

            {/* Diálogo para registrar hora de cierre */}
            <Dialog open={closingTimeDialog} onClose={handleCloseClosingTimeDialog}>
                <DialogTitle>Registrar Hora de Cierre</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Como encargado de cierre, debes registrar la hora de cierre del local para hoy.
                    </Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="closingTime"
                        label="Hora de Cierre"
                        type="time"
                        fullWidth
                        variant="standard"
                        value={closingTimeValue}
                        onChange={(e) => {
                            console.log("Valor cambiado:", e.target.value);
                            setClosingTimeValue(e.target.value);
                        }}
                        InputLabelProps={{
                            shrink: true,
                        }}
                        inputProps={{
                            step: 300, // 5 min
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseClosingTimeDialog}>Cancelar</Button>
                    <Button 
                        onClick={handleSetClosingTime} 
                        variant="contained"
                        disabled={!closingTimeValue} // Deshabilitar el botón si no hay valor
                    >
                        Guardar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}