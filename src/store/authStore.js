// src/store/authStore.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
        user: null,
        selectedClientId: null,
        
        // Lista de clientes global
        clients: [],

        setUser: (userData) => {
            console.log("Zustand: setUser llamado con", userData);
            set({ user: userData });
        },
        
        setSelectedClient: (clientId) => {
            console.log("Zustand: Empresa activa cambiada a", clientId);
            set({ selectedClientId: clientId });
        },
        
        // Función para actualizar la lista de clientes globalmente
        setClients: (clientsList) => {
            console.log("Zustand: Lista de clientes actualizada.", clientsList);
            if (Array.isArray(clientsList)) {
                set({ clients: clientsList });
            } else {
                console.error("Zustand: Error - se intentó guardar 'clients' con un valor que no es un array. Ignorando.", clientsList);
            }
        },
        
        // Función para obtener el cliente seleccionado actual
        getSelectedClient: () => {
            const state = get();
            if (!state.selectedClientId) return null;
            return state.clients.find(client => client.id === state.selectedClientId) || null;
        },
        
        // Función para verificar si el usuario tiene acceso a un cliente específico
        hasAccessToClient: (clientId) => {
            const state = get();
            return state.clients.some(client => client.id === clientId);
        },
        
        logout: () => {
            console.log("Zustand: Cerrando sesión, limpiando estado");
            set({ 
                user: null, 
                selectedClientId: null, 
                clients: [] 
            });
        },

        // Función para limpiar solo la empresa seleccionada (sin cerrar sesión)
        clearSelectedClient: () => {
            console.log("Zustand: Limpiando empresa seleccionada");
            set({ selectedClientId: null });
        },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        console.log("Zustand: Rehidratando el estado desde localStorage.", state);
        
        // Validación y limpieza de datos corruptos
        if (state) {
          if (!Array.isArray(state.clients)) {
            console.warn("Zustand: Los datos de 'clients' en localStorage estaban corruptos. Reiniciando a un array vacío.");
            state.clients = [];
          }
          
          // Asegurar que selectedClientId sea válido si existe
          if (state.selectedClientId && state.clients.length > 0) {
            const clientExists = state.clients.some(client => client.id === state.selectedClientId);
            if (!clientExists) {
              console.warn("Zustand: El cliente seleccionado no existe en la lista. Limpiando selección.");
              state.selectedClientId = null;
            }
          }
        }
      },
    }
  )
);