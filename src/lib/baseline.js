// src/lib/baseline.js
// Preguntas predefinidas del instrumento de línea base por módulo.
// Usadas para crear formularios predefinidos en FormManager.

export const BASELINE_QUESTIONS = {
  rc: {
    title: "Instrumento de Línea Base — Relacionamiento Comunitario",
    description: "Evalúa la percepción de la comunidad respecto a la organización. Responde según tu experiencia en el último período.",
    target_group: "Comunidad y stakeholders territoriales",
    questions: [
      { text:"La organización actúa con transparencia y honestidad en su relación con la comunidad.", dim:"percepcion" },
      { text:"Confío en que la organización cumplirá los compromisos que asume con nosotros.", dim:"percepcion" },
      { text:"La organización tiene una imagen positiva en nuestro territorio.", dim:"percepcion" },
      { text:"La organización ha cumplido los acuerdos y compromisos anteriores.", dim:"compromisos" },
      { text:"Cuando hay incumplimientos, la organización los reconoce y busca solución.", dim:"compromisos" },
      { text:"Hay instancias regulares donde podemos expresar nuestras opiniones y ser escuchados.", dim:"dialogo" },
      { text:"Las reuniones con la organización son útiles y generan acuerdos concretos.", dim:"dialogo" },
      { text:"En general, la relación con la organización es fluida y sin conflictos importantes.", dim:"conflictividad", inverse:true },
      { text:"Los conflictos o tensiones que surgen se resuelven de manera justa.", dim:"conflictividad", inverse:true },
    ],
  },
  do: {
    title: "Instrumento de Línea Base — Desarrollo Organizacional",
    description: "Evalúa la salud organizacional desde la perspectiva de los colaboradores. Responde con honestidad — tus respuestas son confidenciales.",
    target_group: "Colaboradores de la organización",
    questions: [
      { text:"Los valores de esta organización se reflejan en cómo actuamos día a día.", dim:"cultura" },
      { text:"Aquí se celebran los logros y se reconoce el buen trabajo.", dim:"cultura" },
      { text:"Me siento orgulloso/a de pertenecer a esta organización.", dim:"cultura" },
      { text:"Me siento motivado/a y comprometido/a con mi trabajo.", dim:"engagement" },
      { text:"Recomendaría a un amigo trabajar en esta organización.", dim:"engagement" },
      { text:"Cuento con las herramientas y recursos necesarios para hacer bien mi trabajo.", dim:"engagement" },
      { text:"Mi jefatura directa me comunica claramente lo que se espera de mí.", dim:"liderazgo" },
      { text:"Puedo hablar con honestidad con mi jefatura sin temor a consecuencias.", dim:"liderazgo" },
      { text:"Mi jefatura se preocupa por mi desarrollo profesional.", dim:"liderazgo" },
    ],
  },
  esg: {
    title: "Instrumento de Línea Base — Sostenibilidad",
    description: "Evalúa la percepción de sostenibilidad de la organización. Responde según tu conocimiento y experiencia.",
    target_group: "Equipo directivo y gestores ESG",
    questions: [
      { text:"Conozco las políticas ambientales de esta organización.", dim:"ambiental" },
      { text:"Esta organización actúa de forma responsable con el medioambiente.", dim:"ambiental" },
      { text:"Esta organización se preocupa genuinamente por el bienestar de sus trabajadores.", dim:"social" },
      { text:"Esta organización tiene un impacto positivo en las comunidades donde opera.", dim:"social" },
      { text:"Esta organización actúa con ética e integridad en sus negocios.", dim:"gobernanza" },
      { text:"Si tuviera que reportar una irregularidad, confío en que sería atendida apropiadamente.", dim:"gobernanza" },
    ],
  },
};

/**
 * Crea un form_template con las preguntas de línea base en Supabase.
 * Devuelve el form creado o null si hay error.
 */
export async function createBaselineForm(supabase, projectId, moduleKey) {
  const tmpl = BASELINE_QUESTIONS[moduleKey];
  if (!tmpl) return null;

  // Create form template
  const { data: form, error: fErr } = await supabase
    .from("form_templates").insert({
      project_id:   projectId,
      module_key:   moduleKey,
      title:        tmpl.title,
      description:  tmpl.description,
      target_group: tmpl.target_group,
      status:       "active",
    }).select().single();

  if (fErr) { console.error("createBaselineForm:", fErr); return null; }

  // Create questions
  const rows = tmpl.questions.map((q, i) => ({
    form_id:      form.id,
    order_index:  i,
    type:         "likert",
    text:         q.text,
    required:     true,
    config_json: {
      scale_min:  1,
      scale_max:  5,
      min_label:  "Muy en desacuerdo",
      max_label:  "Muy de acuerdo",
      dim:        q.dim,
      inverse:    q.inverse || false,
    },
  }));

  const { error: qErr } = await supabase.from("form_questions").insert(rows);
  if (qErr) { console.error("createBaselineForm questions:", qErr); return null; }

  return form;
}
