// src/pages/CompanySelectorPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Button, Box, Alert, CircularProgress, Paper, Grid } from '@mui/material';
import { Business as BusinessIcon } from '@mui/icons-material';
import { useFirestore } from '../hooks/useFirestore';
import { useAuthStore } from '../store/authStore';

export default function CompanySelectorPage() {
    const navigate = useNavigate();
    const { user, setSelectedClient } = useAuthStore();
    const { fetchUserVinculos, fetchClients } = useFirestore();
    
    const [availableCompanies, setAvailableCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [autoRedirected, setAutoRedirected] = useState(false);

    useEffect(() => {
        const getCompanies = async () => {
            setLoading(true);
            setError('');
            try {
                if (!user?.uid) {
                    setError("Usuario no autenticado. Por favor, inicia sesión nuevamente.");
                    setLoading(false);
                    return;
                }

                console.log("Buscando empresas para usuario:", user.uid);
                const vinculos = await fetchUserVinculos(user.uid);
                console.log("Vínculos encontrados:", vinculos);
                
                if (vinculos.length === 0) {
                    setError("No tienes empresas asignadas. Contacta al administrador.");
                    setLoading(false);
                    return;
                }

                // Filtrar solo vínculos activos (activo !== false)
                const activeVinculos = vinculos.filter(v => v.activo !== false);
                console.log("Vínculos activos:", activeVinculos);
                
                if (activeVinculos.length === 0) {
                    setError("No tienes empresas activas asignadas. Contacta al administrador.");
                    setLoading(false);
                    return;
                }

                const clientIds = activeVinculos.map(v => v.clientId);
                console.log("IDs de clientes a buscar:", clientIds);
                
                const allClients = await fetchClients();
                console.log("Todos los clientes:", allClients);
                
                const companies = allClients.filter(client => 
                    clientIds.includes(client.id) && client.activo !== false
                );

                console.log("Empresas filtradas:", companies);

                if (companies.length === 0) {
                    setError("No se encontraron empresas activas. Contacta al administrador.");
                    setLoading(false);
                    return;
                }

                setAvailableCompanies(companies);

                // Si solo hay una empresa, seleccionarla automáticamente
                if (companies.length === 1 && !autoRedirected) {
                    console.log("Solo una empresa disponible, redirigiendo automáticamente...");
                    setAutoRedirected(true);
                    await handleSelectCompany(companies[0]);
                }

            } catch (err) {
                console.error("Error al cargar las empresas:", err);
                setError("No se pudieron cargar las empresas. Intenta de nuevo.");
            } finally {
                setLoading(false);
            }
        };

        if (user?.uid) {
            getCompanies();
        } else {
            setLoading(false);
            setError("Usuario no autenticado. Redirigiendo al login...");
            setTimeout(() => navigate('/login'), 2000);
        }
    }, [user, fetchUserVinculos, fetchClients, navigate, autoRedirected]);

    const handleSelectCompany = async (company) => {
        try {
            console.log(`Seleccionando empresa: ${company.nombre} (ID: ${company.id})`);
            setSelectedClient(company.id);
            
            // Pequeña pausa para asegurar que el estado se actualice
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Redirigir según el rol del usuario
            if (user?.rol === 'conductor') {
                console.log("Redirigiendo a conductor-dashboard");
                navigate('/conductor-dashboard');
            } else if (user?.rol === 'empleado') {
                console.log("Redirigiendo a empleado-dashboard");
                navigate('/empleado-dashboard');
            } else {
                console.log("Rol no reconocido, redirigiendo a login");
                navigate('/login');
            }
        } catch (error) {
            console.error("Error al seleccionar empresa:", error);
            setError("Error al seleccionar la empresa. Intenta de nuevo.");
        }
    };

    const handleLogout = () => {
        setSelectedClient(null);
        navigate('/login');
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column' }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ mt: 2 }}>Cargando empresas disponibles...</Typography>
            </Box>
        );
    }

    return (
        <Container component="main" maxWidth="md">
            <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '80vh' }}>
                <Box
                    component="img"
                    sx={{
                        height: 220,
                        mb: 4,
                        maxWidth: '100%'
                    }}
                    alt="Erick Go Logo"
                    src="/erick-go-logo.png"
                    onError={(e) => {
                        e.target.style.display = 'none';
                    }}
                />
                
                <Typography component="h2" variant="h4" sx={{ mt: 2, mb: 4, textAlign: 'center' }}>
                    Selecciona tu Empresa
                </Typography>
                
                {error && (
                    <Alert 
                        severity="error" 
                        sx={{ mb: 2, width: '100%', maxWidth: 400 }}
                        action={
                            <Button color="inherit" size="small" onClick={handleLogout}>
                                Volver al Login
                            </Button>
                        }
                    >
                        {error}
                    </Alert>
                )}

                {!error && availableCompanies.length > 0 && (
                    <>
                        <Typography variant="body1" color="textSecondary" sx={{ mb: 3, textAlign: 'center' }}>
                            Tienes {availableCompanies.length} empresa(s) disponible(s)
                        </Typography>

                        <Grid container spacing={2} justifyContent="center" sx={{ width: '100%' }}>
                            {availableCompanies.map((company) => (
                                <Grid item xs={12} sm={6} md={4} key={company.id}>
                                    <Paper 
                                        sx={{ 
                                            p: 3,
                                            height: '100%',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                backgroundColor: 'primary.light',
                                                transform: 'translateY(-2px)',
                                                boxShadow: 4
                                            },
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            textAlign: 'center'
                                        }} 
                                        elevation={2}
                                        onClick={() => handleSelectCompany(company)}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                            <BusinessIcon color="primary" />
                                            <Typography variant="h6" component="div">
                                                {company.nombre}
                                            </Typography>
                                        </Box>
                                        <Typography variant="body2" color="textSecondary">
                                            {company.direccion || 'Sin dirección especificada'}
                                        </Typography>
                                        {company.telefono && (
                                            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                                                Tel: {company.telefono}
                                            </Typography>
                                        )}
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    </>
                )}

                {!error && availableCompanies.length === 0 && !loading && (
                    <Alert severity="info" sx={{ mb: 2, width: '100%', maxWidth: 400 }}>
                        No hay empresas disponibles para tu usuario.
                    </Alert>
                )}

                <Button 
                    variant="outlined" 
                    color="secondary" 
                    onClick={handleLogout}
                    sx={{ mt: 4 }}
                >
                    Cerrar Sesión
                </Button>
            </Box>
        </Container>
    );
}