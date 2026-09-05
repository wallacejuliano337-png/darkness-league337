"use client";
import { useEffect, useMemo, useState } from "react";
type Props = {
  data: any;
  mutate: (body: any, method?: string) => Promise<boolean>;
};
const field = (
  label: string,
  value: any,
  onChange: (v: string) => void,
  type = "text",
) => (
  <label>
    {label}
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  </label>
);
export default function CompetitionEditor({ data, mutate }: Props) {
  const [settings, setSettings] = useState<any>({}),
    [stages, setStages] = useState<any[]>([]),
    [prizes, setPrizes] = useState<any[]>([]),
    [dirty, setDirty] = useState(false);
  useEffect(() => {
    setSettings({ ...data.settings });
    setStages(
      (data.stages || []).map((x: any) => ({
        ...x,
        group_count:
          Number(x.group_count) ||
          Math.max(
            1,
            Math.ceil(
              (Number(x.team_count) || 1) /
                (Number(data.settings?.group_limit) || 12),
            ),
          ),
        match_count: Number(x.match_count) || 6,
        is_visible: Boolean(x.is_visible),
        is_featured: Boolean(x.is_featured),
      })),
    );
    setPrizes(
      (data.prizes || []).map((x: any) => ({
        ...x,
        is_visible: Boolean(x.is_visible),
      })),
    );
    setDirty(false);
  }, [data.settings?.published_at]);
  const setS = (key: string, value: any) => {
      setSettings((x: any) => ({ ...x, [key]: value }));
      setDirty(true);
    },
    sum = useMemo(
      () =>
        prizes
          .filter((x) => x.is_visible)
          .reduce((n, x) => n + (Number(x.amount) || 0), 0),
      [prizes],
    );
  function stage(i: number, key: string, value: any) {
    setStages((x) =>
      x.map((v, n) =>
        n === i
          ? { ...v, [key]: value }
          : key === "is_featured" && value
            ? { ...v, is_featured: false }
            : v,
      ),
    );
    setDirty(true);
  }
  function prize(i: number, key: string, value: any) {
    setPrizes((x) => x.map((v, n) => (n === i ? { ...v, [key]: value } : v)));
    setDirty(true);
  }
  function move<T>(list: T[], set: (x: T[]) => void, i: number, d: number) {
    const n = i + d;
    if (n < 0 || n >= list.length) return;
    const copy = [...list];
    [copy[i], copy[n]] = [copy[n], copy[i]];
    set(copy);
    setDirty(true);
  }
  async function publish() {
    if (
      !confirm(
        "PUBLICAR ALTERAÇÕES? A página pública será atualizada imediatamente.",
      )
    )
      return;
    if (
      await mutate({ action: "competition_publish", settings, stages, prizes })
    ) {
      setDirty(false);
    }
  }
  return (
    <div className="competitionAdmin">
      <header className="publishBar">
        <div>
          <b>{dirty ? "● RASCUNHO COM ALTERAÇÕES" : "● CONTEÚDO PUBLICADO"}</b>
          <small>
            {settings.published_at
              ? `Última publicação: ${new Date(settings.published_at).toLocaleString("pt-BR")}`
              : "Ainda não publicado"}
          </small>
        </div>
        <button onClick={() => window.open("/", "_blank")}>
          PRÉ-VISUALIZAR NO SITE ↗
        </button>
        <button className="adminPrimary" disabled={!dirty} onClick={publish}>
          PUBLICAR ALTERAÇÕES
        </button>
      </header>
      <section className="competitionBlock">
        <div className="blockTitle">
          <div>
            <small>ROAD TO GLORY</small>
            <h2>FORMATO DA COMPETIÇÃO</h2>
          </div>
          <button
            onClick={() => {
              setStages([
                ...stages,
                {
                  id: crypto.randomUUID(),
                  name: "NOVA FASE",
                  team_count: 0,
                  group_count: 1,
                  match_count: 6,
                  format_text: "",
                  start_date: "",
                  end_date: "",
                  status: "FUTURA",
                  is_visible: true,
                  is_featured: false,
                },
              ]);
              setDirty(true);
            }}
          >
            ＋ ADICIONAR FASE
          </button>
        </div>
        <div className="stageEditor">
          {stages.map((x, i) => (
            <article key={x.id}>
              <header>
                <b>
                  {String(i + 1).padStart(2, "0")} · {x.name}
                </b>
                <div>
                  <button onClick={() => move(stages, setStages, i, -1)}>
                    ↑
                  </button>
                  <button onClick={() => move(stages, setStages, i, 1)}>
                    ↓
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Excluir esta fase?")) {
                        setStages(stages.filter((_, n) => n !== i));
                        setDirty(true);
                      }
                    }}
                  >
                    EXCLUIR
                  </button>
                </div>
              </header>
              <div>
                {field("NOME DA FASE", x.name, (v) => stage(i, "name", v))}
                {field(
                  "QUANTIDADE DE EQUIPES",
                  x.team_count,
                  (v) => stage(i, "team_count", v),
                  "number",
                )}
                {field(
                  "QUANTIDADE DE GRUPOS / SALAS",
                  x.group_count,
                  (v) => stage(i, "group_count", v),
                  "number",
                )}
                {field(
                  "QUANTIDADE DE QUEDAS",
                  x.match_count,
                  (v) => stage(i, "match_count", v),
                  "number",
                )}
                {field("FORMATO / DESCRIÇÃO CURTA", x.format_text, (v) =>
                  stage(i, "format_text", v),
                )}
                {field(
                  "DATA INICIAL",
                  x.start_date,
                  (v) => stage(i, "start_date", v),
                  "date",
                )}
                {field(
                  "DATA FINAL",
                  x.end_date,
                  (v) => stage(i, "end_date", v),
                  "date",
                )}
                <label>
                  STATUS
                  <select
                    value={x.status}
                    onChange={(e) => stage(i, "status", e.target.value)}
                  >
                    <option>ATIVA</option>
                    <option>FUTURA</option>
                    <option>FINALIZADA</option>
                  </select>
                </label>
              </div>
              <footer>
                <label>
                  <input
                    type="checkbox"
                    checked={x.is_visible}
                    onChange={(e) => stage(i, "is_visible", e.target.checked)}
                  />{" "}
                  EXIBIR NO SITE
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={x.is_featured}
                    onChange={(e) => stage(i, "is_featured", e.target.checked)}
                  />{" "}
                  DESTACAR FASE
                </label>
              </footer>
            </article>
          ))}
        </div>
      </section>
      <section className="competitionBlock">
        <div className="blockTitle">
          <div>
            <small>REWARD SYSTEM</small>
            <h2>PREMIAÇÃO</h2>
          </div>
          <button
            onClick={() => {
              setPrizes([
                ...prizes,
                {
                  id: crypto.randomUUID(),
                  title: "NOVO PRÊMIO",
                  amount: 0,
                  is_visible: true,
                },
              ]);
              setDirty(true);
            }}
          >
            ＋ ADICIONAR PREMIAÇÃO
          </button>
        </div>
        <div className="prizeSettings">
          {field(
            "PRIZE POOL TOTAL",
            settings.prize_pool,
            (v) => setS("prize_pool", v),
            "number",
          )}
          <label>
            MOEDA
            <select
              value={settings.prize_currency || "USD"}
              onChange={(e) => setS("prize_currency", e.target.value)}
            >
              <option>USD</option>
              <option>BRL</option>
              <option>EUR</option>
            </select>
          </label>
          {field("TEXTO PRINCIPAL", settings.prize_heading, (v) =>
            setS("prize_heading", v),
          )}
          {field("TEXTO DE DESTAQUE", settings.prize_highlight, (v) =>
            setS("prize_highlight", v),
          )}
        </div>
        <p className="sumWarning">
          SOMA ATUAL DAS PREMIAÇÕES: {settings.prize_currency} {sum} · PRIZE
          POOL ANUNCIADO: {settings.prize_currency} {settings.prize_pool || 0}
        </p>
        <div className="prizeEditor">
          {prizes.map((x, i) => (
            <article key={x.id}>
              <header>
                <b>POSIÇÃO / PRÊMIO {String(i + 1).padStart(2, "0")}</b>
                <div>
                  <button onClick={() => move(prizes, setPrizes, i, -1)}>
                    ↑
                  </button>
                  <button onClick={() => move(prizes, setPrizes, i, 1)}>
                    ↓
                  </button>
                </div>
              </header>
              {field("TÍTULO", x.title, (v) => prize(i, "title", v))}
              {field("VALOR", x.amount, (v) => prize(i, "amount", v), "number")}
              <label>
                <input
                  type="checkbox"
                  checked={x.is_visible}
                  onChange={(e) => prize(i, "is_visible", e.target.checked)}
                />{" "}
                EXIBIR
              </label>
              <button
                onClick={() => {
                  if (confirm("Excluir esta premiação?")) {
                    setPrizes(prizes.filter((_, n) => n !== i));
                    setDirty(true);
                  }
                }}
              >
                EXCLUIR
              </button>
            </article>
          ))}
        </div>
      </section>
      <section className="competitionBlock">
        <div className="blockTitle">
          <div>
            <small>REGISTRATION CAMPAIGN</small>
            <h2>CALL TO ACTION & DATAS</h2>
          </div>
        </div>
        <div className="ctaSettings">
          {field("TÍTULO", settings.cta_title, (v) => setS("cta_title", v))}
          {field("TEXTO DO BOTÃO", settings.cta_button_text, (v) =>
            setS("cta_button_text", v),
          )}
          {field("LINK DO BOTÃO", settings.cta_button_link, (v) =>
            setS("cta_button_link", v),
          )}
          {field(
            "INÍCIO DAS INSCRIÇÕES",
            settings.registration_start,
            (v) => setS("registration_start", v),
            "datetime-local",
          )}
          {field(
            "FINAL DAS INSCRIÇÕES",
            settings.registration_end,
            (v) => setS("registration_end", v),
            "datetime-local",
          )}
          {field(
            "INÍCIO DA SEASON",
            settings.season_start,
            (v) => setS("season_start", v),
            "date",
          )}
          {field(
            "FINAL DA SEASON",
            settings.season_end,
            (v) => setS("season_end", v),
            "date",
          )}
          <label className="registrationSwitch">
            <input
              type="checkbox"
              checked={Boolean(settings.registrations_open)}
              onChange={(e) => setS("registrations_open", e.target.checked)}
            />{" "}
            INSCRIÇÕES {settings.registrations_open ? "ON" : "OFF"}
          </label>
        </div>
      </section>
    </div>
  );
}
