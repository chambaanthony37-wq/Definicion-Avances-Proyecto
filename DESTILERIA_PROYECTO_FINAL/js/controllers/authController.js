import { supabase } from '../config.js';
import { $, mostrarAlerta } from '../utils/helpers.js';

export class AuthController {
    constructor() {
        this.container = $('auth-container');
        this.dashboard = $('dashboard-container');
        this.formLogin = $('form-login');
        this.onLoginSuccess = null;
        this.verificando = false;
    }

    init(onLoginSuccess) {
        this.onLoginSuccess = onLoginSuccess;
        this.formLogin?.addEventListener('submit', this.handleLogin.bind(this));
        $('btn-logout')?.addEventListener('click', this.handleLogout.bind(this));
        this.verificarSesion();
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = $('login-email').value;
        const password = $('login-password').value;
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            await this.verificarSesion();
        } catch (error) {
            mostrarAlerta('Error: ' + error.message);
        }
    }

    async handleLogout() {
        await supabase.auth.signOut();
        this.container.classList.remove('hidden');
        this.container.classList.add('flex');
        this.dashboard.classList.remove('flex');
        this.dashboard.classList.add('hidden');
    }

    obtenerPrimerModulo(rol) {
        const mapa = {
            'Administrador': 'proveedores',
            'Jefe de Bodega': 'mensajes',
            'Operador de Producción': 'produccion',
            'Inspector de Calidad': 'calidad'
        };
        return mapa[rol] || 'proveedores';
    }

    async verificarSesion() {
        if (this.verificando) return;
        this.verificando = true;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const user = session.user;
                const { data: userData } = await supabase
                    .from('usuarios')
                    .select('rol')
                    .eq('id', user.id)
                    .maybeSingle();

                const rolActual = userData?.rol || 'Administrador';
                const moduloInicial = this.obtenerPrimerModulo(rolActual);

                document.querySelectorAll('.modulo-view').forEach(v => v.classList.add('hidden'));
                document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('bg-slate-800', 'text-white'));
                const boton = document.querySelector(`button[onclick*="${moduloInicial}"]`);
                if (boton) boton.classList.add('bg-slate-800', 'text-white');
                const target = document.getElementById(`view-${moduloInicial}`);
                if (target) target.classList.remove('hidden');

                this.actualizarMenu(rolActual);
                $('ui-user-email').innerText = user.email;
                $('ui-user-role').innerText = rolActual;
                $('ui-user-initial').innerText = user.email.charAt(0).toUpperCase();

                this.container.classList.remove('flex');
                this.container.classList.add('hidden');
                this.dashboard.classList.remove('hidden');
                this.dashboard.classList.add('flex');

                if (this.onLoginSuccess) await this.onLoginSuccess({ ...user, rol: rolActual });
                console.log(`✅ Usuario ${rolActual} → Módulo: ${moduloInicial}`);
            } else {
                this.container.classList.remove('hidden');
                this.container.classList.add('flex');
                this.dashboard.classList.remove('flex');
                this.dashboard.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error verificando sesión:', error);
            this.container.classList.remove('hidden');
            this.container.classList.add('flex');
            this.dashboard.classList.remove('flex');
            this.dashboard.classList.add('hidden');
        } finally {
            this.verificando = false;
        }
    }

    actualizarMenu(rol) {
        document.querySelectorAll('.sidebar-link').forEach(enlace => {
            const roles = enlace.getAttribute('data-roles')?.split(',') || [];
            enlace.classList.toggle('hidden', !roles.includes(rol));
        });
    }
}