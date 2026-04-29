"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Icon } from "./icons";
import { apiFetch } from "../lib/api";
import { getAdminToken, setAdminToken, setSystemUser, SystemUser } from "../lib/session";
import { getRhDashboardPath } from "../lib/rh-session";

export function AdminLoginPageClient() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getAdminToken()) {
      router.replace("/");
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedLogin = login.trim();
    if (!normalizedLogin || !password) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<{ accessToken: string; user: SystemUser }>("/auth/login-admin", {
        method: "POST",
        body: JSON.stringify({
          login: normalizedLogin,
          password
        })
      });

      setAdminToken(response.accessToken);
      setSystemUser(response.user);

      if (response.user.role === "ADMIN") {
        router.replace("/");
      } else {
        router.replace(getRhDashboardPath(response.user));
      }
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "Falha ao autenticar."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login__frame">
        <section className="admin-login__hero">
          <div className="admin-login__mascote">
            <Image
              src="/mascote.png"
              alt="Mascote"
              width={320}
              height={320}
              priority
            />
          </div>
        </section>

        <main className="admin-login__card">
          <div className="admin-login__card-header">
            <p className="admin-login__card-kicker">Login</p>
            <h2 className="admin-login__card-title">Entrar</h2>
            <p className="admin-login__card-text">
              Use seu e-mail e senha para acessar o sistema.
            </p>
          </div>

          <form className="admin-login__form" onSubmit={handleSubmit}>
            <label className="admin-login__field">
              <span>Email</span>
              <input
                autoCapitalize="none"
                autoComplete="username"
                autoCorrect="off"
                className="admin-login__input"
                onChange={(event) => {
                  setLogin(event.target.value);
                  if (error) {
                    setError(null);
                  }
                }}
                placeholder="Digite seu e-mail"
                required
                value={login}
              />
            </label>

            <label className="admin-login__field">
              <span>Senha</span>
              <input
                autoComplete="current-password"
                className="admin-login__input"
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (error) {
                    setError(null);
                  }
                }}
                placeholder="Digite sua senha"
                required
                type="password"
                value={password}
              />
            </label>

            <button
              className="admin-login__submit"
              disabled={loading || !login.trim() || !password}
              type="submit"
            >
              <span>{loading ? "Entrando..." : "Entrar"}</span>
              <Icon className="h-5 w-5" name="shield" />
            </button>

            {error ? (
              <p className="admin-login__error" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        </main>
      </div>
    </div>
  );
}
