
import React, { useState } from 'react';

interface LoginProps {
  onLogin: (email: string, password: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const phoenixLogo = "/phoenix-logo.png";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background-light">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="relative w-28 h-28 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-4 p-3 overflow-hidden border border-slate-100 ring-4 ring-white">
          <img
            src={phoenixLogo}
            alt="Phoenix Contábil Logo"
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://img.icons8.com/color/96/phoenix.png";
            }}
          />
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand-orange rounded-full border-4 border-white"></div>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Phoenix <span className="text-primary">Contábil</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1 font-medium italic">"Excelência e Renovação em Contabilidade"</p>
      </div>

      <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-2xl shadow-primary/10 border border-slate-200 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary via-primary to-brand-orange w-full"></div>
        <div className="p-10">
          <div className="mb-8 text-center">
            <h2 className="text-xl font-bold text-slate-900">Bem-vindo de volta</h2>
            <p className="text-slate-500 text-sm">Acesse sua conta para continuar</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">E-mail corporativo</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">mail</span>
                <input
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400"
                  placeholder="exemplo@contabil.com.br"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Senha de acesso</label>
                <a className="text-xs font-bold text-primary hover:text-primary/80 transition-colors" href="#">Recuperar</a>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">lock</span>
                <input
                  className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400"
                  placeholder="Sua senha segura"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" type="button">
                  <span className="material-symbols-outlined text-lg">visibility</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 px-1">
              <input className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary" id="remember" type="checkbox" />
              <label className="text-sm text-slate-600 select-none font-medium" htmlFor="remember">Manter conectado</label>
            </div>

            <button
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 mt-2 active:scale-95"
              type="submit"
            >
              <span>Acessar Painel</span>
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Novo colaborador? <a className="text-primary font-bold hover:underline" href="#">Solicitar convite</a>
            </p>
          </div>
        </div>
      </div>

      <footer className="mt-12 text-center">
        <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
          <span>Ver. 2.5.1</span>
          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
          <span>Segurança</span>
          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
          <span>Suporte Técnico</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-4">© 2024 Phoenix Sistemas Contábeis Ltda. Tecnologia para Contadores.</p>
      </footer>
    </div>
  );
};

export default Login;
