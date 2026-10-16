import type { Locale } from "./config";

export type LegalDoc = "privacidad" | "terminos" | "aviso-medico";
export interface LegalSection {
  h: string;
  p: string[];
}

/**
 * Textos legales BASE. Los datos de la entidad (razón social, domicilio, representante) NO se inventan:
 * quedan marcados [PENDIENTE] y deben completarse y revisarse con asesoría legal antes de cobrar (docs/LAUNCH_CHECKLIST.md).
 */
export function legalSections(locale: Locale, doc: LegalDoc, contact: string): LegalSection[] {
  const T = TEXTS[locale][doc];
  return T.map((s) => ({ h: s.h, p: s.p.map((x) => x.replace("{contact}", contact)) }));
}

type Texts = Record<Locale, Record<LegalDoc, LegalSection[]>>;

const TEXTS: Texts = {
  es: {
    privacidad: [
      { h: "Quién es responsable", p: ["Responsable del tratamiento: [PENDIENTE: razón social, domicilio y representante]. Contacto de privacidad: {contact}."] },
      { h: "Qué datos tratamos", p: ["Para calcular tu score usamos: edad, sexo biológico (solo para el corte de cintura), altura, peso, cintura, actividad física, consumo de fruta/verdura, medicación para presión, antecedente de glucosa alta y antecedentes familiares. No pedimos nombre, fecha de nacimiento ni dirección.", "Si solicitas el informe por email, tratamos tu dirección de correo para enviártelo. Si compras el informe completo, PayPal procesa el pago; nosotros recibimos únicamente la confirmación de la transacción, nunca los datos de tu tarjeta."] },
      { h: "Para qué los usamos", p: ["Para calcular tu score, generar tu informe en PDF, enviártelo por correo, procesar el pago y prestar soporte. No vendemos tus datos ni los compartimos con fines publicitarios."] },
      { h: "Tus respuestas en el navegador", p: ["El cálculo gratuito se realiza en tu navegador. No guardamos tus respuestas de salud en localStorage ni en cookies. Al solicitar el informe, tus respuestas se envían a nuestro servidor cifradas en tránsito para generar el PDF."] },
      { h: "Copia para el equipo (opcional)", p: ["Solo si lo autorizas de forma expresa y separada, el equipo recibe una copia de tu informe para soporte y mejora del servicio. Sin esa autorización, el aviso interno no incluye datos de salud."] },
      { h: "Dónde se guardan y por cuánto tiempo", p: ["El enlace de desbloqueo y los datos necesarios para entregar tu informe se guardan cifrados y se eliminan pasado el plazo de retención configurado (30 días por defecto). Los registros de pago se conservan el tiempo que exijan las obligaciones contables y legales aplicables."] },
      { h: "Proveedores (encargados del tratamiento)", p: ["Vercel (alojamiento), Supabase (base de datos), Resend (envío de correo) y PayPal (pagos). Cada uno trata los datos conforme a su contrato y sus propias políticas."] },
      { h: "Tus derechos", p: ["Puedes solicitar acceso, rectificación, exportación o eliminación de tus datos escribiendo a {contact}. Responderemos en los plazos que exija la ley aplicable. Base legal y plazos por jurisdicción: [PENDIENTE: revisión legal para GDPR, LGPD, Ley 29733 y CCPA/CPRA]."] },
      { h: "Seguridad", p: ["Cifrado en tránsito, cifrado en reposo de los datos clínicos persistidos, acceso restringido y registros sin datos de salud."] },
    ],
    terminos: [
      { h: "Qué es GlucoPredict", p: ["GlucoPredict es una herramienta educativa de cribado. No diagnostica diabetes ni prediabetes, no sustituye una evaluación médica y no debe usarse para decidir un tratamiento."] },
      { h: "Quién puede usarlo", p: ["Personas de 18 a 80 años. No está pensado para embarazo, diabetes ya diagnosticada ni urgencias."] },
      { h: "El informe completo", p: ["Es un producto digital (PDF) de más de 10 páginas con desglose del score, escenarios de la regla, contexto de país, plan educativo de 12 semanas, hoja de seguimiento y resumen para consulta. Se entrega por correo electrónico a la dirección asociada a tu solicitud y puede descargarse tras el pago."] },
      { h: "Precio y pago", p: ["El precio se muestra antes de pagar y se cobra una sola vez, sin suscripción. El pago lo procesa PayPal. Los precios son una hipótesis de producto sujeta a ajuste."] },
      { h: "Entrega inmediata y desistimiento", p: ["Al ser un producto digital de entrega inmediata, al pagar aceptas que se entregue de inmediato y que, una vez entregado, renuncias al derecho de desistimiento en la medida que la ley aplicable lo permita."] },
      { h: "Reembolsos", p: ["Si no puedes acceder al informe por un problema técnico atribuible a GlucoPredict, escríbenos a {contact} y te lo reenviaremos o reembolsaremos el pago. [PENDIENTE: confirmar política de reembolsos con asesoría legal]."] },
      { h: "Limitación de responsabilidad", p: ["La información es orientativa. No asumimos responsabilidad por decisiones médicas tomadas únicamente con base en el score. Ante síntomas o dudas, consulta a un profesional de salud."] },
      { h: "Propiedad intelectual", p: ["El software y el diseño del informe son de GlucoPredict. El uso comercial del nombre FINDRISC y del instrumento está pendiente de revisión legal [PENDIENTE]."] },
      { h: "Datos de la entidad", p: ["[PENDIENTE: razón social, documento tributario, domicilio y ley aplicable]. Contacto: {contact}."] },
    ],
    "aviso-medico": [
      { h: "Qué es y qué no es", p: ["GlucoPredict calcula un score de cribado a partir de una regla publicada (FINDRISC / LA-FINDRISC). Es una herramienta educativa: no diagnostica diabetes ni prediabetes y no estima una probabilidad personal."] },
      { h: "Un score bajo no descarta nada", p: ["Un score bajo no descarta diabetes o prediabetes. Si tienes síntomas, embarazo, diabetes conocida o una preocupación clínica, busca orientación profesional aunque el score sea bajo."] },
      { h: "Qué hacer con el resultado", p: ["Si tu score alcanza el umbral de seguimiento, conviene confirmar con una prueba clínica (por ejemplo HbA1c o glucosa en ayunas) interpretada por un profesional de salud."] },
      { h: "Urgencias", p: ["Si tienes vómitos, dolor abdominal intenso, respiración muy agitada, confusión o somnolencia marcada, busca atención médica urgente. No esperes a un resultado de esta herramienta."] },
      { h: "Evidencia y límites", p: ["Las bandas porcentuales son referencias históricas de la población original del modelo, no tu probabilidad. El umbral de Perú cuenta con una validación externa de 2024 en 549 trabajadores de un hospital; los demás perfiles de país son preliminares."] },
    ],
  },
  en: {
    privacidad: [
      { h: "Who is responsible", p: ["Data controller: [PENDING: legal name, address and representative]. Privacy contact: {contact}."] },
      { h: "What data we process", p: ["To calculate your score we use: age, biological sex (only for the waist cut-off), height, weight, waist, physical activity, fruit/vegetable intake, blood pressure medication, history of high glucose and family history. We do not ask for your name, date of birth or address.", "If you request the report by email, we process your email address to send it. If you buy the full report, PayPal processes the payment; we only receive the transaction confirmation, never your card details."] },
      { h: "What we use it for", p: ["To calculate your score, generate your PDF report, email it to you, process payment and provide support. We do not sell your data or share it for advertising."] },
      { h: "Your answers in the browser", p: ["The free calculation runs in your browser. We do not store your health answers in localStorage or cookies. When you request the report, your answers are sent to our server, encrypted in transit, to generate the PDF."] },
      { h: "Copy for the team (optional)", p: ["Only if you expressly and separately authorize it, the team receives a copy of your report for support and service improvement. Without that authorization, the internal notice includes no health data."] },
      { h: "Where it is stored and for how long", p: ["The unlock link and the data needed to deliver your report are stored encrypted and deleted after the configured retention period (30 days by default). Payment records are kept as long as accounting and legal obligations require."] },
      { h: "Providers (processors)", p: ["Vercel (hosting), Supabase (database), Resend (email) and PayPal (payments). Each processes data under its contract and its own policies."] },
      { h: "Your rights", p: ["You can request access, rectification, export or deletion of your data by writing to {contact}. We will respond within the periods required by applicable law. Legal basis and deadlines by jurisdiction: [PENDING: legal review for GDPR, LGPD, Peru Law 29733 and CCPA/CPRA]."] },
      { h: "Security", p: ["Encryption in transit, encryption at rest for persisted clinical data, restricted access and logs without health data."] },
    ],
    terminos: [
      { h: "What GlucoPredict is", p: ["GlucoPredict is an educational screening tool. It does not diagnose diabetes or prediabetes, does not replace a medical evaluation and must not be used to decide treatment."] },
      { h: "Who can use it", p: ["People aged 18 to 80. It is not intended for pregnancy, already diagnosed diabetes or emergencies."] },
      { h: "The full report", p: ["A digital product (PDF) of 10+ pages with a score breakdown, rule scenarios, country context, a 12-week educational plan, a tracking sheet and a summary for your appointment. It is delivered by email to the address tied to your request and can be downloaded after payment."] },
      { h: "Price and payment", p: ["The price is shown before paying and charged once, with no subscription. Payment is processed by PayPal. Prices are a product hypothesis subject to adjustment."] },
      { h: "Immediate delivery and withdrawal", p: ["Because it is a digital product delivered immediately, by paying you accept immediate delivery and, once delivered, waive the right of withdrawal to the extent permitted by applicable law."] },
      { h: "Refunds", p: ["If you cannot access the report because of a technical problem attributable to GlucoPredict, write to {contact} and we will resend it or refund the payment. [PENDING: confirm refund policy with legal counsel]."] },
      { h: "Limitation of liability", p: ["The information is guidance only. We are not liable for medical decisions made solely on the basis of the score. If you have symptoms or concerns, consult a health professional."] },
      { h: "Intellectual property", p: ["The software and the report design belong to GlucoPredict. Commercial use of the FINDRISC name and instrument is pending legal review [PENDING]."] },
      { h: "Entity details", p: ["[PENDING: legal name, tax ID, address and governing law]. Contact: {contact}."] },
    ],
    "aviso-medico": [
      { h: "What it is and is not", p: ["GlucoPredict calculates a screening score from a published rule (FINDRISC / LA-FINDRISC). It is an educational tool: it does not diagnose diabetes or prediabetes and does not estimate a personal probability."] },
      { h: "A low score does not rule anything out", p: ["A low score does not rule out diabetes or prediabetes. If you have symptoms, pregnancy, known diabetes or a clinical concern, seek professional guidance even if your score is low."] },
      { h: "What to do with the result", p: ["If your score reaches the follow-up threshold, it is worth confirming with a clinical test (for example HbA1c or fasting glucose) interpreted by a health professional."] },
      { h: "Emergencies", p: ["If you have vomiting, severe abdominal pain, very rapid breathing, confusion or marked drowsiness, seek urgent medical care. Do not wait for a result from this tool."] },
      { h: "Evidence and limits", p: ["Percentage bands are historical references from the model's original population, not your probability. The Peru threshold has a 2024 external validation in 549 hospital workers; the other country profiles are preliminary."] },
    ],
  },
  pt: {
    privacidad: [
      { h: "Quem é o responsável", p: ["Controlador dos dados: [PENDENTE: razão social, endereço e representante]. Contato de privacidade: {contact}."] },
      { h: "Quais dados tratamos", p: ["Para calcular seu score usamos: idade, sexo biológico (apenas para o corte da cintura), altura, peso, cintura, atividade física, consumo de frutas/verduras, medicamento para pressão, antecedente de glicose alta e antecedentes familiares. Não pedimos nome, data de nascimento nem endereço.", "Se você solicitar o relatório por email, tratamos seu endereço de email para enviá-lo. Se comprar o relatório completo, o PayPal processa o pagamento; nós recebemos apenas a confirmação da transação, nunca os dados do seu cartão."] },
      { h: "Para que usamos", p: ["Para calcular seu score, gerar seu relatório em PDF, enviá-lo por email, processar o pagamento e prestar suporte. Não vendemos seus dados nem os compartilhamos para publicidade."] },
      { h: "Suas respostas no navegador", p: ["O cálculo gratuito é feito no seu navegador. Não guardamos suas respostas de saúde em localStorage nem em cookies. Ao solicitar o relatório, suas respostas são enviadas ao nosso servidor, cifradas em trânsito, para gerar o PDF."] },
      { h: "Cópia para a equipe (opcional)", p: ["Somente se você autorizar de forma expressa e separada, a equipe recebe uma cópia do seu relatório para suporte e melhoria do serviço. Sem essa autorização, o aviso interno não inclui dados de saúde."] },
      { h: "Onde ficam e por quanto tempo", p: ["O link de desbloqueio e os dados necessários para entregar seu relatório ficam cifrados e são eliminados após o prazo de retenção configurado (30 dias por padrão). Os registros de pagamento são mantidos pelo tempo exigido por obrigações contábeis e legais."] },
      { h: "Fornecedores (operadores)", p: ["Vercel (hospedagem), Supabase (banco de dados), Resend (email) e PayPal (pagamentos). Cada um trata os dados conforme seu contrato e suas próprias políticas."] },
      { h: "Seus direitos", p: ["Você pode solicitar acesso, retificação, exportação ou exclusão dos seus dados escrevendo para {contact}. Responderemos nos prazos exigidos pela lei aplicável. Base legal e prazos por jurisdição: [PENDENTE: revisão jurídica para GDPR, LGPD, Lei 29733 do Peru e CCPA/CPRA]."] },
      { h: "Segurança", p: ["Cifragem em trânsito, cifragem em repouso dos dados clínicos persistidos, acesso restrito e registros sem dados de saúde."] },
    ],
    terminos: [
      { h: "O que é o GlucoPredict", p: ["O GlucoPredict é uma ferramenta educacional de triagem. Não diagnostica diabetes nem pré-diabetes, não substitui uma avaliação médica e não deve ser usado para decidir tratamento."] },
      { h: "Quem pode usar", p: ["Pessoas de 18 a 80 anos. Não é indicado para gravidez, diabetes já diagnosticada nem urgências."] },
      { h: "O relatório completo", p: ["É um produto digital (PDF) com mais de 10 páginas, com detalhamento do score, cenários da regra, contexto do país, plano educativo de 12 semanas, planilha de acompanhamento e resumo para a consulta. É entregue por email ao endereço associado à sua solicitação e pode ser baixado após o pagamento."] },
      { h: "Preço e pagamento", p: ["O preço é exibido antes de pagar e cobrado uma única vez, sem assinatura. O pagamento é processado pelo PayPal. Os preços são uma hipótese de produto sujeita a ajuste."] },
      { h: "Entrega imediata e arrependimento", p: ["Por ser um produto digital de entrega imediata, ao pagar você aceita a entrega imediata e, uma vez entregue, renuncia ao direito de arrependimento na medida permitida pela lei aplicável."] },
      { h: "Reembolsos", p: ["Se você não conseguir acessar o relatório por um problema técnico atribuível ao GlucoPredict, escreva para {contact} e o reenviaremos ou reembolsaremos o pagamento. [PENDENTE: confirmar política de reembolsos com assessoria jurídica]."] },
      { h: "Limitação de responsabilidade", p: ["A informação é orientativa. Não nos responsabilizamos por decisões médicas tomadas apenas com base no score. Diante de sintomas ou dúvidas, consulte um profissional de saúde."] },
      { h: "Propriedade intelectual", p: ["O software e o design do relatório pertencem ao GlucoPredict. O uso comercial do nome FINDRISC e do instrumento está pendente de revisão jurídica [PENDENTE]."] },
      { h: "Dados da entidade", p: ["[PENDENTE: razão social, documento fiscal, endereço e lei aplicável]. Contato: {contact}."] },
    ],
    "aviso-medico": [
      { h: "O que é e o que não é", p: ["O GlucoPredict calcula um score de triagem a partir de uma regra publicada (FINDRISC / LA-FINDRISC). É uma ferramenta educacional: não diagnostica diabetes nem pré-diabetes e não estima uma probabilidade pessoal."] },
      { h: "Um score baixo não descarta nada", p: ["Um score baixo não exclui diabetes ou pré-diabetes. Se você tiver sintomas, gravidez, diabetes conhecida ou uma preocupação clínica, procure orientação profissional mesmo com score baixo."] },
      { h: "O que fazer com o resultado", p: ["Se o seu score atingir o limiar de acompanhamento, vale confirmar com um exame clínico (por exemplo HbA1c ou glicemia de jejum) interpretado por um profissional de saúde."] },
      { h: "Urgências", p: ["Se tiver vômitos, dor abdominal intensa, respiração muito acelerada, confusão ou sonolência marcada, procure atendimento médico urgente. Não espere um resultado desta ferramenta."] },
      { h: "Evidência e limites", p: ["As faixas percentuais são referências históricas da população original do modelo, não a sua probabilidade. O limiar do Peru tem uma validação externa de 2024 em 549 trabalhadores de um hospital; os demais perfis de país são preliminares."] },
    ],
  },
};
