// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestore } from '../hooks/useFirestore';
import {
    Container, TextField, Button, Box, Alert, CircularProgress,
    Typography, InputAdornment, Paper, IconButton, Link,
    Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ShareIcon from '@mui/icons-material/Share';
import CloseIcon from '@mui/icons-material/Close';

// Importamos el componente ShareAppModal
import ShareAppModal from '../components/ShareAppModal';

export default function LoginPage() {
    const { setUser } = useAuthStore();
    const { fetchGlobalConfig } = useFirestore();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Estados para la funcionalidad de la contraseña
    const [showPassword, setShowPassword] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [resetMessage, setResetMessage] = useState('');
    
    // Estados para el menú desplegable
    const [anchorEl, setAnchorEl] = useState(null);
    const [manualDialogOpen, setManualDialogOpen] = useState(false);
    const [manualType, setManualType] = useState(''); // 'empleado' o 'conductor'
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    
    const [footerText, setFooterText] = useState('');

    // Efecto para cargar el texto del pie de página y la configuración
    useEffect(() => {
        const getFooterText = async () => {
            try {
                const config = await fetchGlobalConfig();
                setFooterText(config.loginFooterText || 'Copyright © 2025 Desarrollado por Erick Simosa\nerickgoapp@gmail.com - 0424 3036024');
            } catch (error) {
                console.error("Error al cargar configuración:", error);
                setFooterText('Copyright © 2025 Desarrollado por Erick Simosa\nerickgoapp@gmail.com - 0424 3036024');
            }
        };
        getFooterText();
    }, [fetchGlobalConfig]);

    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const fullUserData = { uid: user.uid, ...userData };
                console.log("Datos del usuario desde Firestore:", fullUserData);
                setUser(fullUserData);

                // Redirigir según el rol
                switch (fullUserData.rol) {
                    case 'administrador':
                        navigate('/admin-dashboard');
                        break;
                    case 'empleado':
                        // Para empleados, redirigir a selector de empresa si tiene múltiples empresas
                        navigate('/empleado-dashboard');
                        break;
                    case 'conductor':
                        // Para conductores, redirigir a selector de empresa si tiene múltiples empresas
                        navigate('/conductor-dashboard');
                        break;
                    default:
                        setError("Rol de usuario no reconocido.");
                }
            } else {
                setError("Error: No se encontró el perfil de usuario. Contacte al administrador.");
            }
        } catch (error) {
            console.error("Error en login:", error);
            if (error.code === 'auth/invalid-credential') {
                setError("Correo o contraseña incorrectos.");
            } else if (error.code === 'auth/too-many-requests') {
                setError("Demasiados intentos fallidos. Intenta más tarde o restablece tu contraseña.");
            } else {
                setError("Error al iniciar sesión. Verifica tu conexión e intenta nuevamente.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!email) {
            setError("Por favor, introduce tu correo electrónico para restablecer la contraseña.");
            return;
        }
        setIsResetting(true);
        setResetMessage('');
        setError('');
        try {
            await sendPasswordResetEmail(auth, email);
            setResetMessage("Se ha enviado un correo para restablecer tu contraseña. Revisa tu bandeja de entrada y la carpeta de spam.");
        } catch (error) {
            console.error("Error al enviar correo de reseteo:", error);
            if (error.code === 'auth/user-not-found') {
                setError("No existe una cuenta con este correo electrónico.");
            } else if (error.code === 'auth/invalid-email') {
                setError("El formato del correo electrónico no es válido.");
            } else {
                setError("Error al enviar el correo de restablecimiento. Verifica que el correo sea correcto.");
            }
        } finally {
            setIsResetting(false);
        }
    };

    // Funciones para el menú desplegable
    const handleMenuClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleOpenEmployeeManual = () => {
        setManualType('empleado');
        setManualDialogOpen(true);
        handleMenuClose();
    };

    const handleOpenDriverManual = () => {
        setManualType('conductor');
        setManualDialogOpen(true);
        handleMenuClose();
    };

    const handleOpenShareDialog = () => {
        setShareDialogOpen(true);
        handleMenuClose();
    };

    const handleCloseManualDialog = () => {
        setManualDialogOpen(false);
    };

    const handleCloseShareDialog = () => {
        setShareDialogOpen(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && email && password && !loading) {
            handleLogin();
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
                backgroundColor: '#f5f5f5',
            }}
        >
            {/* Contenedor principal que centra el formulario verticalmente */}
            <Container component="main" maxWidth="sm" sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 2 }}>
                <Paper sx={{ p: 3, boxShadow: 3, width: '100%', position: 'relative' }} elevation={3}>
                    {/* Menú de tres puntos en la esquina superior derecha */}
                    <IconButton
                        aria-label="menu"
                        aria-controls="menu-appbar"
                        aria-haspopup="true"
                        onClick={handleMenuClick}
                        sx={{ position: 'absolute', top: 10, right: 10 }}
                    >
                        <MoreVertIcon />
                    </IconButton>
                    
                    <Menu
                        id="menu-appbar"
                        anchorEl={anchorEl}
                        anchorOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        keepMounted
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        open={Boolean(anchorEl)}
                        onClose={handleMenuClose}
                    >
                        <MenuItem onClick={handleOpenEmployeeManual}>
                            <ListItemIcon>
                                <MenuBookIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Manual de Usuario para Empleados</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={handleOpenDriverManual}>
                            <ListItemIcon>
                                <MenuBookIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Manual de Usuario para Conductores</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={handleOpenShareDialog}>
                            <ListItemIcon>
                                <ShareIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Compartir Aplicación</ListItemText>
                        </MenuItem>
                    </Menu>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <Box
                            component="img"
                            sx={{
                                height: 160,
                                mb: 1,
                            }}
                            alt="Erick Go Logo"
                            src="/erick-go-logo.png"
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                        
                        <Typography component="h1" variant="h4" align="center">Iniciar Sesión</Typography>
                        
                        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%' }} onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                            <TextField
                                label="Correo Electrónico"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyPress={handleKeyPress}
                                autoComplete="username"
                                required
                                fullWidth
                                InputProps={{ startAdornment: (<InputAdornment position="start"><EmailIcon /></InputAdornment>) }}
                            />
                            <TextField
                                label="Contraseña"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyPress={handleKeyPress}
                                autoComplete="current-password"
                                required
                                fullWidth
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="toggle password visibility"
                                                onClick={() => setShowPassword(!showPassword)}
                                                edge="end"
                                            >
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={loading || !email || !password}
                                sx={{ py: 1.5 }}
                                fullWidth
                            >
                                {loading ? <CircularProgress size={24} color="inherit" /> : 'Iniciar Sesión'}
                            </Button>
                            
                            <Box sx={{ textAlign: 'center' }}>
                                <Link 
                                    component="button" 
                                    variant="body2" 
                                    onClick={handlePasswordReset}
                                    disabled={isResetting}
                                    type="button"
                                    underline="hover"
                                >
                                    {isResetting ? 'Enviando...' : '¿Olvidaste tu contraseña?'}
                                </Link>
                            </Box>

                            {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
                            {resetMessage && <Alert severity="success" sx={{ mt: 1 }}>{resetMessage}</Alert>}
                        </Box>
                    </Box>
                </Paper>
            </Container>

            {/* Pie de página fijo en la parte inferior */}
            <Box sx={{ py: 2, textAlign: 'center', width: '100%', flexShrink: 0 }}>
                <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-line' }}>
                    {footerText}
                </Typography>
            </Box>

            {/* Diálogo para mostrar los manuales */}
            <Dialog open={manualDialogOpen} onClose={handleCloseManualDialog} maxWidth="md" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {manualType === 'empleado' ? 'Manual de Usuario para Empleados' : 'Manual de Usuario para Conductores'}
                    <IconButton onClick={handleCloseManualDialog}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {manualType === 'empleado' ? (
                        <Box>
                            <Typography variant="h6" gutterBottom>Bienvenido al Manual de Usuario para Empleados</Typography>
                            <Typography paragraph>
                                Esta guía te ayudará a utilizar la aplicación Erick Go como empleado.
                            </Typography>
                            
                            <Typography variant="subtitle1" gutterBottom>1. Inicio de Sesión</Typography>
                            <Typography paragraph>
                                Para acceder a la aplicación, introduce tu correo electrónico y contraseña proporcionados por tu administrador.
                                Si olvidas tu contraseña, puedes utilizar la opción "¿Olvidaste tu contraseña?" para restablecerla.
                            </Typography>
                            
                            <Typography variant="subtitle1" gutterBottom>2. Registro de Asistencia</Typography>
                            <Typography paragraph>
                                Una vez iniciada la sesión, verás las zonas disponibles. Selecciona tu zona de destino para registrar tu asistencia diaria.
                                Si eres el encargado de cierre, deberás registrar la hora de cierre del local antes de poder registrar tu asistencia.
                            </Typography>
                            
                            <Typography variant="subtitle1" gutterBottom>3. Seguimiento de Viajes</Typography>
                            <Typography paragraph>
                                Después de registrar tu asistencia, el sistema asignará un conductor para tu viaje. Podrás ver el estado de tu viaje
                                y recibirás notificaciones cuando el conductor esté cerca de tu destino.
                            </Typography>
                            
                            <Typography variant="subtitle1" gutterBottom>4. Finalización del Viaje</Typography>
                            <Typography paragraph>
                                Cuando llegues a tu destino, el conductor marcará tu asistencia como completada. Recibirás una confirmación
                                en la aplicación.
                            </Typography>
                            
                            <Typography variant="subtitle1" gutterBottom>5. Contacto de Soporte</Typography>
                            <Typography paragraph>
                                Si tienes algún problema o pregunta, contacta a tu administrador o envía un correo a erickgoapp@gmail.com.
                            </Typography>
                        </Box>
                    ) : (
                        <Box>
                            <Typography variant="h6" gutterBottom>Bienvenido al Manual de Usuario para Conductores</Typography>
                            <Typography paragraph>
                                Esta guía te ayudará a utilizar la aplicación Erick Go como conductor.
                            </Typography>
                            
                            <Typography variant="subtitle1" gutterBottom>1. Inicio de Sesión</Typography>
                            <Typography paragraph>
                                Para acceder a la aplicación, introduce tu correo electrónico y contraseña proporcionados por tu administrador.
                                Si olvidas tu contraseña, puedes utilizar la opción "¿Olvidaste tu contraseña?" para restablecerla.
                            </Typography>
                            
                            <Typography variant="subtitle1" gutterBottom>2. Selección de Empresa</Typography>
                            <Typography paragraph>
                                Si trabajas para múltiples empresas, selecciona la empresa para la cual realizarás los viajes hoy.
                            </Typography>
                            
                            <Typography variant="subtitle1" gutterBottom>3. Visualización de Empleados</Typography>
                            <Typography paragraph>
                                En el panel principal, verás la lista de empleados disponibles para hoy, junto con la hora de cierre registrada.
                                Esta hora es importante para planificar tus viajes y asegurar que todos los empleados sean recogidos a tiempo.
                            </Typography>
                            
                            <Typography variant="subtitle1" gutterBottom>4. Organización de Viajes</Typography>
                            <Typography paragraph>
                                Puedes elegir entre dos modos de viaje:
                                - Viaje único: Todos los empleados en un solo viaje
                                - Viajes por grupos: Organiza los viajes según los grupos de zonas configurados
                            </Typography>
                            
                            <Typography variant="subtitle1" gutterBottom>5. Inicio de Viaje</Typography>
                            <Typography paragraph>
                                Una vez organizados los viajes, inicia el viaje correspondiente. Durante el viaje, marca la llegada de cada empleado
                                a su destino. Esto registrará su asistencia como completada.
                            </Typography>
                            
                            <Typography variant="subtitle1" gutterBottom>6. Finalización de Jornada</Typography>
                            <Typography paragraph>
                                Cuando hayas entregado a todos los empleados, finaliza tu jornada. Esto registrará el fin de tu trabajo para el día.
                            </Typography>
                            
                            <Typography variant="subtitle1" gutterBottom>7. Contacto de Soporte</Typography>
                            <Typography paragraph>
                                Si tienes algún problema o pregunta, contacta a tu administrador o envía un correo a erickgoapp@gmail.com.
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseManualDialog}>Cerrar</Button>
                </DialogActions>
            </Dialog>

            {/* Componente ShareAppModal para compartir la aplicación */}
            <ShareAppModal open={shareDialogOpen} onClose={handleCloseShareDialog} />
        </Box>
    );
}