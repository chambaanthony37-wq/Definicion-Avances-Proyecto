import { AuthController } from './controllers/authController.js';
import { ProveedorController } from './controllers/proveedorController.js';
import { BodegaController } from './controllers/bodegaController.js';
import { LotesController } from './controllers/lotesController.js';
import { CalidadController } from './controllers/calidadController.js';
import { InventarioController } from './controllers/inventarioController.js';
import { InformesController } from './controllers/informesController.js';
import { MensajesController } from './controllers/mensajesController.js';
import { UsuariosController } from './controllers/usuariosController.js';

class App {
    constructor() {
        this.controllers = {};
        this.inicializado = false;
    }

    init() {
        if (this.inicializado) return;
        this.inicializado = true;

        this.configurarNavegacion();

        this.controllers.auth = new AuthController();
        this.controllers.proveedor = new ProveedorController();
        this.controllers.bodega = new BodegaController();
        this.controllers.lotes = new LotesController(this.controllers.bodega);
        this.controllers.calidad = new CalidadController();
        this.controllers.inventario = new InventarioController();
        this.controllers.informes = new InformesController();
        this.controllers.mensajes = new MensajesController();
        this.controllers.usuarios = new UsuariosController();

        this.controllers.auth.init(() => {
            this.cargarDatos();
        });

        this.controllers.proveedor.init();
        this.controllers.bodega.init(() => {
            this.controllers.lotes.actualizarSelects();
        });
        this.controllers.lotes.init(() => {
            this.controllers.calidad.actualizarSelects();
            this.controllers.inventario.cargar();
        });
        this.controllers.calidad.init();
        this.controllers.inventario.init(null, this.controllers.mensajes);
        this.controllers.informes.init();
        this.controllers.mensajes.init();
        this.controllers.usuarios.init();

        this.cargarDatos();
    }

    async cargarDatos() {
        try {
            await Promise.all([
                this.controllers.proveedor.cargar(),
                this.controllers.bodega.cargar(),
                this.controllers.lotes.cargar(),
                this.controllers.calidad.cargar(),
                this.controllers.inventario.cargar(),
                this.controllers.mensajes.cargar(),
                this.controllers.usuarios.cargar()
            ]);
        } catch (error) {
            console.error('Error cargando datos:', error);
        }
    }

    configurarNavegacion() {
        window.navegar = (modulo) => {
            console.log('🚀 Navegando a:', modulo);
            document.querySelectorAll('.modulo-view').forEach(view => view.classList.add('hidden'));
            document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('bg-slate-800', 'text-white'));
            const botonActivo = document.querySelector(`button[onclick*="${modulo}"]`);
            if (botonActivo) botonActivo.classList.add('bg-slate-800', 'text-white');
            const target = document.getElementById(`view-${modulo}`);
            if (target) target.classList.remove('hidden');
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});