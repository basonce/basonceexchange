import { Agent } from './agent-assignment';

interface GreetingTemplates {
  [languageCode: string]: string[];
}

const greetingTemplates: GreetingTemplates = {
  tr: [
    `Merhaba! {name} {country} ofisinden size özel atandım. Konuyla ilgili çözümü birlikte buluruz! Sorunuz nedir?`,
    `Merhaba! Ben {name}, {country} ofisinden yazıyorum. Size yardımcı olmak için buradayım. Sorununuzu dinliyorum.`,
    `Selam! {name} burada, {country} destek ekibinden. Mesajınızı aldım, hemen çözüme kavuşturalım. Ne konuda yardımcı olabilirim?`,
    `Merhaba! {name}, {region} ofisinden bağlanıyorum. Talebinizi değerlendiriyorum, size nasıl yardımcı olabilirim?`,
    `Merhaba! Ben {name}, {country}'den size destek vermek üzere görevlendirildim. Sorununuzu çözmek için buradayım!`,
  ],
  en: [
    `Hello! {name} from {country} office has been assigned to you. We'll find a solution together! What can I help you with?`,
    `Hi! I'm {name}, writing from {country} office. I'm here to help you. Tell me about your issue.`,
    `Hey! {name} here from {country} support team. I got your message, let's solve this right away. How can I assist you?`,
    `Hello! {name}, connecting from {region} office. I'm reviewing your request, how can I help you?`,
    `Hi! I'm {name}, assigned to support you from {country}. I'm here to resolve your issue!`,
  ],
  de: [
    `Hallo! {name} vom {country}-Büro wurde Ihnen zugewiesen. Wir finden gemeinsam eine Lösung! Wobei kann ich Ihnen helfen?`,
    `Guten Tag! Ich bin {name} und schreibe aus dem {country}-Büro. Ich bin hier, um Ihnen zu helfen. Erzählen Sie mir von Ihrem Anliegen.`,
    `Hallo! {name} hier vom {country} Support-Team. Ich habe Ihre Nachricht erhalten, lassen Sie uns das sofort lösen. Wie kann ich helfen?`,
    `Hallo! {name}, melde mich aus dem {region}-Büro. Ich prüfe Ihre Anfrage, wie kann ich Ihnen helfen?`,
    `Guten Tag! Ich bin {name} und wurde Ihnen aus {country} zugewiesen. Ich bin hier, um Ihr Problem zu lösen!`,
  ],
  fr: [
    `Bonjour! {name} du bureau de {country} vous a été assigné. Nous trouverons une solution ensemble! Comment puis-je vous aider?`,
    `Salut! Je suis {name}, j'écris depuis le bureau de {country}. Je suis là pour vous aider. Parlez-moi de votre problème.`,
    `Bonjour! {name} ici de l'équipe support {country}. J'ai reçu votre message, résolvons cela tout de suite. Comment puis-je vous assister?`,
    `Bonjour! {name}, je me connecte depuis le bureau {region}. J'examine votre demande, comment puis-je vous aider?`,
    `Bonjour! Je suis {name}, assigné pour vous aider depuis {country}. Je suis là pour résoudre votre problème!`,
  ],
  es: [
    `¡Hola! {name} de la oficina de {country} ha sido asignado a usted. ¡Encontraremos una solución juntos! ¿En qué puedo ayudarte?`,
    `¡Hola! Soy {name}, escribiendo desde la oficina de {country}. Estoy aquí para ayudarte. Cuéntame sobre tu problema.`,
    `¡Hola! {name} aquí del equipo de soporte de {country}. Recibí tu mensaje, resolvamos esto de inmediato. ¿Cómo puedo asistirte?`,
    `¡Hola! {name}, conectando desde la oficina de {region}. Estoy revisando tu solicitud, ¿cómo puedo ayudarte?`,
    `¡Hola! Soy {name}, asignado para ayudarte desde {country}. ¡Estoy aquí para resolver tu problema!`,
  ],
  it: [
    `Ciao! {name} dall'ufficio di {country} ti è stato assegnato. Troveremo una soluzione insieme! Come posso aiutarti?`,
    `Ciao! Sono {name}, scrivo dall'ufficio di {country}. Sono qui per aiutarti. Parlami del tuo problema.`,
    `Ciao! {name} qui dal team di supporto {country}. Ho ricevuto il tuo messaggio, risolviamo subito. Come posso assisterti?`,
    `Ciao! {name}, mi collego dall'ufficio {region}. Sto esaminando la tua richiesta, come posso aiutarti?`,
    `Ciao! Sono {name}, assegnato per supportarti da {country}. Sono qui per risolvere il tuo problema!`,
  ],
  ru: [
    `Привет! {name} из офиса {country} был назначен вам. Мы найдем решение вместе! Чем могу помочь?`,
    `Привет! Я {name}, пишу из офиса {country}. Я здесь, чтобы помочь вам. Расскажите о вашей проблеме.`,
    `Привет! {name} из команды поддержки {country}. Получил ваше сообщение, давайте решим это прямо сейчас. Как я могу помочь?`,
    `Привет! {name}, подключаюсь из офиса {region}. Рассматриваю ваш запрос, чем могу помочь?`,
    `Привет! Я {name}, назначен для поддержки из {country}. Я здесь, чтобы решить вашу проблему!`,
  ],
  zh: [
    `您好！来自{country}办公室的{name}已分配给您。我们会一起找到解决方案！有什么可以帮您的吗？`,
    `您好！我是{name}，来自{country}办公室。我在这里帮助您。请告诉我您的问题。`,
    `您好！我是{country}支持团队的{name}。收到您的消息了，让我们马上解决。我能如何协助您？`,
    `您好！{name}，从{region}办公室连接。我正在审查您的请求，我能如何帮助您？`,
    `您好！我是{name}，从{country}分配来支持您。我在这里解决您的问题！`,
  ],
  ja: [
    `こんにちは！{country}オフィスの{name}が担当させていただきます。一緒に解決策を見つけましょう！どのようにお手伝いできますか？`,
    `こんにちは！{country}オフィスの{name}です。お手伝いさせていただきます。問題について教えてください。`,
    `こんにちは！{country}サポートチームの{name}です。メッセージを受け取りました。すぐに解決しましょう。どうお手伝いできますか？`,
    `こんにちは！{region}オフィスから{name}が接続しています。リクエストを確認しています。どうお手伝いできますか？`,
    `こんにちは！{country}から{name}がサポートに割り当てられました。問題を解決するためにここにいます！`,
  ],
  ko: [
    `안녕하세요! {country} 사무소의 {name}이 배정되었습니다. 함께 해결책을 찾겠습니다! 무엇을 도와드릴까요?`,
    `안녕하세요! {country} 사무소의 {name}입니다. 도와드리기 위해 여기 있습니다. 문제에 대해 말씀해 주세요.`,
    `안녕하세요! {country} 지원팀의 {name}입니다. 메시지를 받았습니다. 바로 해결하겠습니다. 어떻게 도와드릴까요?`,
    `안녕하세요! {region} 사무소에서 {name}이 연결했습니다. 요청을 검토하고 있습니다. 어떻게 도와드릴까요?`,
    `안녕하세요! {country}에서 {name}이 지원하도록 배정되었습니다. 문제를 해결하기 위해 여기 있습니다!`,
  ],
  ar: [
    `مرحباً! تم تعيين {name} من مكتب {country} لك. سنجد الحل معاً! كيف يمكنني مساعدتك؟`,
    `مرحباً! أنا {name}، أكتب من مكتب {country}. أنا هنا لمساعدتك. أخبرني عن مشكلتك.`,
    `مرحباً! {name} هنا من فريق دعم {country}. استلمت رسالتك، دعنا نحل هذا على الفور. كيف يمكنني مساعدتك؟`,
    `مرحباً! {name}، أتصل من مكتب {region}. أراجع طلبك، كيف يمكنني مساعدتك؟`,
    `مرحباً! أنا {name}، تم تعييني لدعمك من {country}. أنا هنا لحل مشكلتك!`,
  ],
  pt: [
    `Olá! {name} do escritório de {country} foi designado para você. Vamos encontrar uma solução juntos! Como posso ajudá-lo?`,
    `Oi! Sou {name}, escrevendo do escritório de {country}. Estou aqui para ajudá-lo. Conte-me sobre seu problema.`,
    `Olá! {name} aqui da equipe de suporte de {country}. Recebi sua mensagem, vamos resolver isso agora. Como posso ajudá-lo?`,
    `Olá! {name}, conectando do escritório de {region}. Estou revisando sua solicitação, como posso ajudá-lo?`,
    `Oi! Sou {name}, designado para ajudá-lo de {country}. Estou aqui para resolver seu problema!`,
  ],
  hi: [
    `नमस्ते! {country} कार्यालय से {name} आपको सौंपा गया है। हम एक साथ समाधान खोजेंगे! मैं आपकी कैसे मदद कर सकता हूँ?`,
    `नमस्ते! मैं {name} हूँ, {country} कार्यालय से लिख रहा हूँ। मैं आपकी मदद के लिए यहाँ हूँ। मुझे अपनी समस्या के बारे में बताएं।`,
    `नमस्ते! {country} सहायता टीम से {name} यहाँ। मुझे आपका संदेश मिल गया है, चलिए इसे तुरंत हल करते हैं। मैं आपकी कैसे सहायता कर सकता हूँ?`,
    `नमस्ते! {name}, {region} कार्यालय से जुड़ रहा हूँ। मैं आपके अनुरोध की समीक्षा कर रहा हूँ, मैं आपकी कैसे मदद कर सकता हूँ?`,
    `नमस्ते! मैं {name} हूँ, {country} से आपकी सहायता के लिए नियुक्त किया गया हूँ। मैं आपकी समस्या को हल करने के लिए यहाँ हूँ!`,
  ],
  id: [
    `Halo! {name} dari kantor {country} telah ditugaskan untuk Anda. Kami akan menemukan solusi bersama! Apa yang bisa saya bantu?`,
    `Hai! Saya {name}, menulis dari kantor {country}. Saya di sini untuk membantu Anda. Ceritakan masalah Anda.`,
    `Halo! {name} di sini dari tim dukungan {country}. Saya menerima pesan Anda, mari kita selesaikan sekarang. Bagaimana saya bisa membantu?`,
    `Halo! {name}, terhubung dari kantor {region}. Saya sedang meninjau permintaan Anda, bagaimana saya bisa membantu?`,
    `Hai! Saya {name}, ditugaskan untuk mendukung Anda dari {country}. Saya di sini untuk menyelesaikan masalah Anda!`,
  ],
  th: [
    `สวัสดี! {name} จากสำนักงาน {country} ได้รับมอบหมายให้คุณแล้ว เราจะหาทางแก้ไขด้วยกัน! ฉันจะช่วยคุณได้อย่างไร?`,
    `สวัสดี! ฉันคือ {name} เขียนจากสำนักงาน {country} ฉันอยู่ที่นี่เพื่อช่วยคุณ บอกฉันเกี่ยวกับปัญหาของคุณ`,
    `สวัสดี! {name} อยู่ที่นี่จากทีมสนับสนุน {country} ฉันได้รับข้อความของคุณแล้ว มาแก้ไขเดี๋ยวนี้เลย ฉันจะช่วยคุณได้อย่างไร?`,
    `สวัสดี! {name} เชื่อมต่อจากสำนักงาน {region} ฉันกำลังตรวจสอบคำขอของคุณ ฉันจะช่วยคุณได้อย่างไร?`,
    `สวัสดี! ฉันคือ {name} ได้รับมอบหมายให้สนับสนุนคุณจาก {country} ฉันอยู่ที่นี่เพื่อแก้ไขปัญหาของคุณ!`,
  ],
  vi: [
    `Xin chào! {name} từ văn phòng {country} đã được phân công cho bạn. Chúng tôi sẽ tìm giải pháp cùng nhau! Tôi có thể giúp gì cho bạn?`,
    `Xin chào! Tôi là {name}, viết từ văn phòng {country}. Tôi ở đây để giúp bạn. Hãy nói cho tôi về vấn đề của bạn.`,
    `Xin chào! {name} đây từ nhóm hỗ trợ {country}. Tôi đã nhận được tin nhắn của bạn, hãy giải quyết ngay bây giờ. Tôi có thể hỗ trợ bạn như thế nào?`,
    `Xin chào! {name}, kết nối từ văn phòng {region}. Tôi đang xem xét yêu cầu của bạn, tôi có thể giúp bạn như thế nào?`,
    `Xin chào! Tôi là {name}, được phân công hỗ trợ bạn từ {country}. Tôi ở đây để giải quyết vấn đề của bạn!`,
  ],
  pl: [
    `Cześć! {name} z biura {country} został przypisany do Ciebie. Znajdziemy rozwiązanie razem! W czym mogę pomóc?`,
    `Cześć! Jestem {name}, piszę z biura {country}. Jestem tutaj, aby Ci pomóc. Opowiedz mi o swoim problemie.`,
    `Cześć! {name} tutaj z zespołu wsparcia {country}. Otrzymałem Twoją wiadomość, rozwiążmy to od razu. Jak mogę Ci pomóc?`,
    `Cześć! {name}, łączę się z biura {region}. Sprawdzam Twoje żądanie, jak mogę Ci pomóc?`,
    `Cześć! Jestem {name}, przypisany do wsparcia z {country}. Jestem tutaj, aby rozwiązać Twój problem!`,
  ],
  nl: [
    `Hallo! {name} van het {country}-kantoor is aan u toegewezen. We vinden samen een oplossing! Waarmee kan ik u helpen?`,
    `Hoi! Ik ben {name}, schrijf vanuit het {country}-kantoor. Ik ben hier om u te helpen. Vertel me over uw probleem.`,
    `Hallo! {name} hier van het {country} ondersteuningsteam. Ik heb uw bericht ontvangen, laten we dit meteen oplossen. Hoe kan ik u helpen?`,
    `Hallo! {name}, maak verbinding vanaf het {region}-kantoor. Ik bekijk uw verzoek, hoe kan ik u helpen?`,
    `Hoi! Ik ben {name}, toegewezen om u te ondersteunen vanuit {country}. Ik ben hier om uw probleem op te lossen!`,
  ],
  sv: [
    `Hej! {name} från {country}-kontoret har tilldelats dig. Vi hittar en lösning tillsammans! Vad kan jag hjälpa dig med?`,
    `Hej! Jag är {name}, skriver från {country}-kontoret. Jag är här för att hjälpa dig. Berätta om ditt problem.`,
    `Hej! {name} här från {country} supportteam. Jag fick ditt meddelande, låt oss lösa detta direkt. Hur kan jag hjälpa dig?`,
    `Hej! {name}, ansluter från {region}-kontoret. Jag granskar din förfrågan, hur kan jag hjälpa dig?`,
    `Hej! Jag är {name}, tilldelad för att stödja dig från {country}. Jag är här för att lösa ditt problem!`,
  ],
  el: [
    `Γεια σας! Ο {name} από το γραφείο {country} έχει ανατεθεί σε εσάς. Θα βρούμε μια λύση μαζί! Πώς μπορώ να σας βοηθήσω;`,
    `Γεια σας! Είμαι ο {name}, γράφω από το γραφείο {country}. Είμαι εδώ για να σας βοηθήσω. Πείτε μου για το πρόβλημά σας.`,
    `Γεια σας! {name} εδώ από την ομάδα υποστήριξης {country}. Έλαβα το μήνυμά σας, ας το λύσουμε αμέσως. Πώς μπορώ να σας βοηθήσω;`,
    `Γεια σας! {name}, συνδέομαι από το γραφείο {region}. Εξετάζω το αίτημά σας, πώς μπορώ να σας βοηθήσω;`,
    `Γεια σας! Είμαι ο {name}, ανατέθηκα να σας υποστηρίξω από {country}. Είμαι εδώ για να λύσω το πρόβλημά σας!`,
  ],
  cs: [
    `Ahoj! {name} z kanceláře {country} byl přiřazen k vám. Najdeme řešení společně! S čím vám mohu pomoci?`,
    `Ahoj! Jsem {name}, píšu z kanceláře {country}. Jsem tu, abych vám pomohl. Řekněte mi o svém problému.`,
    `Ahoj! {name} tady od podpůrného týmu {country}. Dostal jsem vaši zprávu, pojďme to vyřešit hned. Jak vám mohu pomoci?`,
    `Ahoj! {name}, připojuji se z kanceláře {region}. Kontroluji vaši žádost, jak vám mohu pomoci?`,
    `Ahoj! Jsem {name}, přidělen k podpoře z {country}. Jsem tu, abych vyřešil váš problém!`,
  ],
};

export function getAgentGreeting(agent: Agent): string {
  const languageCode = agent.language_code || 'en';
  const templates = greetingTemplates[languageCode] || greetingTemplates['en'];

  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];

  return randomTemplate
    .replace(/{name}/g, agent.name)
    .replace(/{country}/g, agent.country_name)
    .replace(/{region}/g, agent.region);
}
