// ==========================================
// UTILIDADES COMPARTIDAS
// ==========================================

// Selector rápido
export const $ = (id) => document.getElementById(id);

// ==========================================
// 🔥 SISTEMA DE CONFIRMACIÓN PERSONALIZADA
// ==========================================

// Confirmación personalizada (reemplaza confirm())
export const confirmar = (mensaje, titulo = '¿Estás seguro?', tipo = 'danger') => {
    return new Promise((resolve) => {
        // Crear overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        // Configurar icono y color según tipo
        const config = {
            danger: {
                icon: '🗑️',
                iconClass: '',
                btnClass: 'modal-btn-danger',
                btnText: 'Eliminar'
            },
            warning: {
                icon: '⚠️',
                iconClass: 'warning',
                btnClass: 'modal-btn-danger',
                btnText: 'Confirmar'
            },
            info: {
                icon: 'ℹ️',
                iconClass: 'warning',
                btnClass: 'modal-btn-success',
                btnText: 'Aceptar'
            }
        };
        
        const cfg = config[tipo] || config.danger;
        
        overlay.innerHTML = `
            <div class="modal-confirm">
                <div class="modal-icon ${cfg.iconClass}">${cfg.icon}</div>
                <div class="modal-title">${titulo}</div>
                <div class="modal-message">${mensaje}</div>
                <div class="modal-actions">
                    <button class="modal-btn modal-btn-cancel" id="modal-cancel">
                        Cancelar
                    </button>
                    <button class="modal-btn ${cfg.btnClass}" id="modal-confirm">
                        ${cfg.btnText}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Forzar reflow para animación
        void overlay.offsetHeight;
        overlay.classList.add('active');

        // Manejar eventos
        const cancelar = () => {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.remove();
                resolve(false);
            }, 300);
        };

        const confirmarAccion = () => {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.remove();
                resolve(true);
            }, 300);
        };

        overlay.querySelector('#modal-cancel').addEventListener('click', cancelar);
        overlay.querySelector('#modal-confirm').addEventListener('click', confirmarAccion);
        
        // Cerrar al hacer clic fuera del modal
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cancelar();
        });

        // Cerrar con Escape
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                cancelar();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    });
};

// ==========================================
// 🔥 SISTEMA DE NOTIFICACIONES TOAST
// ==========================================

// Crear contenedor de toasts si no existe
const getToastContainer = () => {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
};

// Mostrar notificación tipo toast
export const mostrarToast = (message, type = 'success', title = '') => {
    const container = getToastContainer();
    
    // Configuración por tipo
    const config = {
        success: {
            icon: '✅',
            title: title || 'Éxito',
            defaultMessage: 'Operación completada correctamente'
        },
        error: {
            icon: '❌',
            title: title || 'Error',
            defaultMessage: 'Ocurrió un error'
        },
        warning: {
            icon: '⚠️',
            title: title || 'Advertencia',
            defaultMessage: 'Revise la información'
        },
        info: {
            icon: 'ℹ️',
            title: title || 'Información',
            defaultMessage: 'Operación en proceso'
        }
    };

    const typeConfig = config[type] || config.success;
    
    // Crear elemento toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${typeConfig.icon}</div>
        <div class="toast-content">
            <div class="toast-title">${typeConfig.title}</div>
            <div class="toast-message">${message || typeConfig.defaultMessage}</div>
        </div>
        <button class="toast-close" onclick="this.closest('.toast').remove()">✕</button>
    `;

    container.appendChild(toast);

    // Auto-eliminar después de 4 segundos
    const timeout = setTimeout(() => {
        eliminarToast(toast);
    }, 4000);

    // Permitir cerrar manualmente con hover
    toast.addEventListener('mouseenter', () => clearTimeout(timeout));
    toast.addEventListener('mouseleave', () => {
        setTimeout(() => {
            if (toast.parentNode) {
                eliminarToast(toast);
            }
        }, 2000);
    });

    return toast;
};

// Eliminar toast con animación
const eliminarToast = (toast) => {
    if (!toast || !toast.parentNode) return;
    toast.classList.add('removing');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 300);
};

// 🔥 Función legacy para compatibilidad (reemplaza el alert)
export const mostrarAlerta = (mensaje, tipo = 'info') => {
    mostrarToast(mensaje, tipo);
};

// ==========================================
// FUNCIONES DE RENDERIZADO
// ==========================================

// Renderizar tabla con datos
export const renderTabla = (tbodyId, data, renderFn) => {
    const tbody = $(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = data.map(renderFn).join('');
};

// Actualizar select
export const actualizarSelect = (selectId, data, valueKey, labelKey, placeholder = '') => {
    const select = $(selectId);
    if (!select) return;
    select.innerHTML = placeholder ? `<option value="">${placeholder}</option>` : '';
    select.innerHTML += data.map(item => 
        `<option value="${item[valueKey]}">${item[labelKey]}</option>`
    ).join('');
};

// Formatear ID corto
export const idCorto = (id) => id?.slice(0, 6) || 'N/A';

// Badge de estado
export const badgeEstado = (aprobado) => {
    return aprobado 
        ? '<span class="px-2 py-1 bg-emerald-100 text-emerald-700 font-bold rounded text-xs">✓ Aprobado</span>'
        : '<span class="px-2 py-1 bg-rose-100 text-rose-700 font-bold rounded text-xs">✗ Rechazado</span>';
};

export const botonesAccion = (id, editFn, deleteFn) => `
    <button onclick="${editFn}('${id}')" 
            class="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-200 transition">
        ✏️ Editar
    </button>
    <button onclick="${deleteFn}('${id}')" 
            class="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-200 transition">
        ❌ Eliminar
    </button>
`;

// ==========================================
// 🆕 NUEVA LISTA DE FASES (SOLO 4 OPCIONES)
// ==========================================
export const FASES = ['Fermentación', 'Destilación', 'Añejamiento', 'Finalizado'];

// Convertir galones a litros
export const galonesALitros = (galones) => (galones * 3.78541).toFixed(2);

// Calcular botellas desde litros
export const litrosABotellas = (litros) => Math.floor(litros * 0.8 * 1.333);

// Estado de inventario
export const estadoInventario = (botellas) => {
    if (botellas < 50) return '<span class="px-2 py-1 bg-rose-100 text-rose-800 rounded-lg text-xs font-bold">⚠️ Alerta Reorden</span>';
    if (botellas < 150) return '<span class="px-2 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold">📦 Stock Medio</span>';
    return '<span class="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold">✅ Stock Óptimo</span>';
};