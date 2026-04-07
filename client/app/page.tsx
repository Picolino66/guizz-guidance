"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Icon } from "../components/icons";
import { apiFetch } from "../lib/api";
import { clearActiveQuizId, setParticipantToken } from "../lib/session";

export default function HomePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [easterEgg, setEasterEgg] = useState(false);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.shiftKey && event.key === "I") {
        setEasterEgg((prev) => !prev);
        setSpinning(true);
        setTimeout(() => setSpinning(false), 550);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<{ accessToken: string }>("/auth/login-participant", {
        method: "POST",
        body: JSON.stringify({ email: normalizedEmail })
      });

      setParticipantToken(response.accessToken);
      clearActiveQuizId();
      router.push("/waiting");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "Falha ao autenticar."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`login-home${easterEgg ? " login-home--easter-egg" : ""}`}>
      {!easterEgg && <div aria-hidden="true" className="login-home__ribbon" />}
      {!easterEgg && <div aria-hidden="true" className="login-home__ribbon login-home__ribbon--secondary" />}
      {!easterEgg && <div aria-hidden="true" className="login-home__glow login-home__glow--left" />}
      {!easterEgg && <div aria-hidden="true" className="login-home__glow login-home__glow--right" />}

      <main className="login-card">
        <header className="login-brand">
          <div aria-hidden="true" className={`login-brand-mark${easterEgg ? " login-brand-mark--easter-egg" : ""}`}>
            <Image
              src={easterEgg ? "/egs.jpeg" : "/mascote.png"}
              alt="Mascote"
              width={100}
              height={100}
              className={`login-mascote${spinning ? " login-mascote--spin" : ""}`}
              priority
            />
          </div>

          <div className="login-copy">
            <h1 className="login-title">Quiz Guidance</h1>
            <p className="login-subtitle">
              Informe seu e-mail corporativo para participar do quiz.
            </p>
          </div>
        </header>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-visually-hidden" htmlFor="participant-email">
            E-mail corporativo
          </label>

          <div className="login-input-shell">
            <span aria-hidden="true" className="login-input-icon">
              <Icon className="h-5 w-5" name="mail" />
            </span>

            <input
              aria-describedby="participant-note"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              className="login-input"
              id="participant-email"
              inputMode="email"
              onChange={(event) => {
                setEmail(event.target.value);
                if (error) {
                  setError(null);
                }
              }}
              placeholder="Digite seu e-mail @guidance.com"
              required
              type="email"
              value={email}
            />
          </div>

          <button className="login-submit" disabled={loading || !email.trim()} type="submit">
            <span>{loading ? "Entrando..." : "Entrar no Quiz"}</span>
            <span aria-hidden="true" className="login-submit__sparkle">
              <Icon className="h-5 w-5" name="sparkles" />
            </span>
          </button>

          {error ? (
            <p className="login-error" role="alert">
              {error}
            </p>
          ) : null}
        </form>

        <p className="login-footnote" id="participant-note">
          Apenas funcionários cadastrados podem participar
        </p>
      </main>
    </div>
  );
}
