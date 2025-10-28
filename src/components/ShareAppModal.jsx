// src/components/ShareAppModal.jsx
import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Box, Typography, Tabs, Tab, Paper, IconButton
} from '@mui/material';
import QRCode from 'react-qr-code';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CloseIcon from '@mui/icons-material/Close';

// *** IMPORTANTE: Reemplaza esta URL con la URL de tu aplicación desplegada ***
const APP_URL = "https://erick-go-pwa.netlify.app/"; 

const TabPanel = (props) => {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
};

export default function ShareAppModal({ open, onClose }) {
    const [tabValue, setTabValue] = React.useState(0);

    const handleShareWhatsApp = () => {
        const message = `¡Hola! Te comparto la app Erick Go para organizar nuestros viajes. Instálala desde aquí: ${APP_URL}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            {/* --- CORRECCIÓN AQUÍ: Texto directo en DialogTitle y estilos con sx --- */}
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                🚀 Compartir Erick Go
                <IconButton onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2" sx={{ mb: 2 }}>
                    Escanea el código QR o comparte el enlace para que todos puedan instalar la aplicación en sus teléfonos.
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                    <Paper sx={{ p: 2 }}>
                        <QRCode
                            size={200}
                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                            value={APP_URL}
                            viewBox={`0 0 256 256`}
                        />
                    </Paper>
                </Box>
                
                <Button
                    variant="contained"
                    startIcon={<WhatsAppIcon />}
                    onClick={handleShareWhatsApp}
                    fullWidth
                    sx={{ mb: 2 }}
                >
                    Compartir por WhatsApp
                </Button>

                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} centered>
                    <Tab label="Instrucciones Android" />
                    <Tab label="Instrucciones iOS (iPhone)" />
                </Tabs>

                <TabPanel value={tabValue} index={0}>
                    <Typography variant="h6">Para instalar en Android:</Typography>
                    <ol>
                        <li>Abre este enlace en tu navegador <strong>Chrome</strong>.</li>
                        <li>Toca el menú de los tres puntos (⋮) en la esquina superior derecha.</li>
                        <li>Selecciona la opción <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong>.</li>
                        <li>Confirma tocando <strong>"Instalar"</strong>.</li>
                        <li>¡Listo! La app aparecerá en tu pantalla de inicio como cualquier otra.</li>
                    </ol>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    <Typography variant="h6">Para instalar en iOS (iPhone/iPad):</Typography>
                    <ol>
                        <li>Abre este enlace en tu navegador <strong>Safari</strong>.</li>
                        <li>Toca el botón de <strong>Compartir</strong> (el cuadrado con una flecha hacia arriba) en la parte inferior de la pantalla.</li>
                        <li>Desliza hacia abajo y selecciona <strong>"Añadir a pantalla de inicio"</strong>.</li>
                        <li>Puedes cambiar el nombre si lo deseas y toca <strong>"Añadir"</strong>.</li>
                        <li>¡Listo! La app aparecerá en tu pantalla de inicio.</li>
                    </ol>
                </TabPanel>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cerrar</Button>
            </DialogActions>
        </Dialog>
    );
}