// src/components/RegisterUserModal.jsx
import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Button, MenuItem, Box, Alert, InputAdornment, IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material'; // <-- IMPORTAR ICONOS
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAuthStore } from '../store/authStore';
import { useFirestore } from '../hooks/useFirestore';

export default function RegisterUserModal({ open, onClose, onUserCreated }) {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        nombre: '',
        rol: 'empleado',
        telefono: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false); // <-- NUEVO ESTADO

    const { selectedClientId } = useAuthStore();
    const { fetchUserByEmail, createVinculo } = useFirestore();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        setSuccess('');

        if (!selectedClientId) {
            setError("Error: No se ha seleccionado una empresa. Por favor, selecciona una empresa desde el menú superior.");
            setLoading(false);
            return;
        }

        try {
            const existingUser = await fetchUserByEmail(formData.email);

            if (existingUser) {
                console.log("Usuario existente encontrado. Creando vínculo...");
                await createVinculo(existingUser.id, selectedClientId, formData.rol);
                setSuccess(`Usuario "${existingUser.nombre}" vinculado a esta empresa correctamente.`);
                onUserCreated();
                setTimeout(handleClose, 2000);

            } else {
                if (!formData.password) {
                    setError("Para un nuevo usuario, la contraseña es obligatoria.");
                    setLoading(false);
                    return;
                }
                console.log("Nuevo usuario. Creando en Auth y Firestore...");
                
                const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
                const user = userCredential.user;

                const userRef = doc(db, 'usuarios', user.uid);
                await setDoc(userRef, {
                    correo: user.email,
                    rol: formData.rol,
                    nombre: formData.nombre,
                    telefono: formData.telefono,
                    enLinea: false,
                });

                await createVinculo(user.uid, selectedClientId, formData.rol);
                
                setSuccess('Nuevo usuario creado y vinculado correctamente.');
                onUserCreated();
                setTimeout(handleClose, 2000);
            }

        } catch (err) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError('Error: El correo ya está en uso en Firebase Authentication pero no se encontró en el sistema. Contacte al administrador.');
            } else if (err.code === 'auth/weak-password') {
                setError('La contraseña es muy débil. Debe tener al menos 6 caracteres.');
            } else {
                setError('Ocurrió un error al procesar la solicitud. Intente de nuevo.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({ email: '', password: '', nombre: '', rol: 'empleado', telefono: '' });
        setError('');
        setSuccess('');
        setShowPassword(false); // <-- REINICIAR ESTADO AL CERRAR
        onClose();
    };
    
    const handleClickShowPassword = () => {
        setShowPassword(!showPassword);
    };

    const handleMouseDownPassword = (event) => {
        event.preventDefault();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Registrar Nuevo Usuario</DialogTitle>
            <DialogContent>
                <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <TextField
                        label="Correo Electrónico"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        fullWidth
                        required
                        helperText="Si el usuario ya existe, solo será vinculado a esta empresa."
                    />
                    <TextField
                        label="Contraseña"
                        name="password"
                        type={showPassword ? 'text' : 'password'} // <-- TIPO CONDICIONAL
                        value={formData.password}
                        onChange={handleChange}
                        fullWidth
                        helperText="Obligatoria solo para usuarios nuevos."
                        InputProps={{ // <-- AÑADIR PROPS DE INPUT
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        aria-label="toggle password visibility"
                                        onClick={handleClickShowPassword}
                                        onMouseDown={handleMouseDownPassword}
                                        edge="end"
                                    >
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                    <TextField
                        label="Nombre Completo"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleChange}
                        fullWidth
                        required
                    />
                    <TextField
                        label="Teléfono"
                        name="telefono"
                        type="tel"
                        value={formData.telefono}
                        onChange={handleChange}
                        fullWidth
                        placeholder="+58 414-123-4567"
                    />
                    <TextField
                        select
                        label="Rol"
                        name="rol"
                        value={formData.rol}
                        onChange={handleChange}
                        fullWidth
                    >
                        <MenuItem value="empleado">Empleado</MenuItem>
                        <MenuItem value="conductor">Conductor</MenuItem>
                    </TextField>
                    {error && <Alert severity="error">{error}</Alert>}
                    {success && <Alert severity="success">{success}</Alert>}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancelar</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading || !formData.email || !formData.nombre}>
                    {loading ? 'Procesando...' : 'Registrar o Vincular'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}