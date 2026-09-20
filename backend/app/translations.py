"""Multilingual message catalogue with graceful fallback.

Covers the 11 supported languages: English, Hindi, Marathi, Tamil, Telugu,
Gujarati, Bengali, Kannada, Malayalam, Punjabi and Rajasthani. Rajasthani uses
Hindi script text (as the client speech map already does). Unknown/missing keys
fall back first to English, then to the raw key so nothing crashes.
"""

CATALOGUE: dict[str, dict[str, str]] = {
    "en": {
        "pay.success": "Payment of {amount} to {recipient} was successful.",
        "pay.received": "You received {amount} from {sender}. Check your account.",
        "pay.wait.confirm": "Payment of {amount} to {recipient} is waiting for your confirmation.",
        "pay.notify": "Saathi confirmed your payment of {amount} to {recipient}.",
        "pay.trusted": "Saathi let you know: {sender} sent {amount} to {recipient}.",
        "dot.pop": "Never enter your UPI PIN to receive money.",
        "qr.safe": "This QR code looks safe.",
        "qr.fake": "This QR code may be fake. Do not scan unknown codes.",
        "qr.collect": "This is a Collect Request. Only pay when you recognise the requester.",
        "pin.private": "Your UPI PIN is private. Never share it, even with bank staff.",
        "screen.share": "Never share your screen while entering your PIN.",
        "voice.on": "Voice guidance is on. I will guide you for every payment.",
        "voice.off": "Voice guidance is off.",
    },
    "hi": {
        "pay.success": "{recipient} को {amount} का भुगतान सफल रहा।",
        "pay.received": "आपको {sender} से {amount} प्राप्त हुआ।",
        "pay.wait.confirm": "{recipient} को {amount} का भुगतान आपकी पुष्टि की प्रतीक्षा में है।",
        "pay.notify": "साथी ने {recipient} को {amount} के भुगतान की पुष्टि कर दी।",
        "pay.trusted": "साथी की सूचना: {sender} ने {recipient} को {amount} भेजा।",
        "dot.pop": "पैसे प्राप्त करने के लिए कभी भी अपना UPI PIN न डालें।",
        "qr.safe": "यह QR कोड सुरक्षित लग रहा है।",
        "qr.fake": "यह QR कोड नकली हो सकता है।",
        "qr.collect": "यह एक कलेक्ट रिक्वेस्ट है।",
        "pin.private": "आपका UPI PIN निजी है। इसे कभी साझा न करें।",
        "screen.share": "PIN डालते समय स्क्रीन कभी साझा न करें।",
        "voice.on": "वॉइस गाइडेंस चालू है।",
        "voice.off": "वॉइस गाइडेंस बंद है।",
    },
    "mr": {
        "pay.success": "{recipient} यांना {amount} चे पेमेंट यशस्वी झाले.",
        "pay.received": "तुम्हाला {sender} कडून {amount} प्राप्त झाले.",
        "pay.wait.confirm": "{recipient} यांना {amount} चे पेमेंट तुमच्या पुष्टीची वाट पाहत आहे.",
        "pay.notify": "साथीने {recipient} यांना {amount} च्या पेमेंटची पुष्टी केली.",
        "pay.trusted": "साथीने सांगितले: {sender} ने {recipient} यांना {amount} पाठवले.",
        "dot.pop": "पैसे घेण्यासाठी कधीही UPI PIN टाकू नका.",
        "qr.safe": "हे QR कोड सुरक्षित दिसते.",
        "qr.fake": "हे QR कोड बनावट असू शकते.",
        "qr.collect": "ही एक कलेक्ट रिक्वेस्ट आहे.",
        "pin.private": "तुमचा UPI PIN खाजगी आहे.",
        "screen.share": "PIN टाकताना स्क्रीन कधीही शेअर करू नका.",
        "voice.on": "व्हॉइस गाइडन्स चालू आहे.",
        "voice.off": "व्हॉइस गाइडन्स बंद आहे.",
    },
    "ta": {
        "pay.success": "{recipient} க்கு {amount} பணம் செலுத்துதல் வெற்றிகரமாக முடிந்தது.",
        "pay.received": "{sender} இடமிருந்து {amount} பெற்றீர்கள்.",
        "pay.wait.confirm": "{recipient} க்கு {amount} பணம் செலுத்த உங்கள் உறுதிப்படுத்தல் தேவை.",
        "pay.notify": "சாதி {recipient} க்கு {amount} பணம் செலுத்தியதை உறுதி செய்தது.",
        "pay.trusted": "சாதி தகவல்: {sender} {recipient} க்கு {amount} அனுப்பினார்.",
        "dot.pop": "பணம் பெற UPI PIN ஒருபோதும் உள்ளிட வேண்டாம்.",
        "qr.safe": "இந்த QR குறியீடு பாதுகாப்பாகத் தெரிகிறது.",
        "qr.fake": "இந்த QR குறியீடு போலியாக இருக்கலாம்.",
        "qr.collect": "இது ஒரு கலெக்ட் ரிக்வெஸ்ட்.",
        "pin.private": "உங்கள் UPI PIN தனிப்பட்டது.",
        "screen.share": "PIN உள்ளிடும்போது திரையைப் பகிர வேண்டாம்.",
        "voice.on": "குரல் வழிகாட்டுதல் இயக்கத்தில் உள்ளது.",
        "voice.off": "குரல் வழிகாட்டுதல் முடக்கப்பட்டது.",
    },
    "te": {
        "pay.success": "{recipient} కి {amount} చెల్లింపు విజయవంతమైంది.",
        "pay.received": "{sender} నుండి {amount} అందుకున్నారు.",
        "pay.wait.confirm": "{recipient} కి {amount} చెల్లించడానికి మీ నిర్ధారణ అవసరం.",
        "pay.notify": "సాథీ {recipient} కి {amount} చెల్లింపును ధృవీకరించింది.",
        "pay.trusted": "సాథీ సమాచారం: {sender} {recipient} కి {amount} పంపారు.",
        "dot.pop": "డబ్బు పొందడానికి UPI PIN ఎప్పుడూ నమోదు చేయవద్దు.",
        "qr.safe": "ఈ QR కోడ్ సురక్షితంగా కనిపిస్తుంది.",
        "qr.fake": "ఈ QR కోడ్ నకిలీ కావచ్చు.",
        "qr.collect": "ఇది కలెక్ట్ రిక్వెస్ట్.",
        "pin.private": "మీ UPI PIN ప్రైవేట్.",
        "screen.share": "PIN నమోదు చేసేటప్పుడు స్క్రీన్ షేర్ చేయవద్దు.",
        "voice.on": "వాయిస్ గైడెన్స్ ఆన్ చేయబడింది.",
        "voice.off": "వాయిస్ గైడెన్స్ ఆఫ్ చేయబడింది.",
    },
    "gu": {
        "pay.success": "{recipient} ને {amount} ચુકવણી સફળ રહી.",
        "pay.received": "તમને {sender} પાસેથી {amount} મળ્યા.",
        "pay.wait.confirm": "{recipient} ને {amount} ચૂકવવા માટે તમારી પુષ્ટિ જરૂરી છે.",
        "pay.notify": "સાથીએ {recipient} ને {amount} ની ચુકવણીની પુષ્ટિ કરી.",
        "pay.trusted": "સાથીની જાણકારી: {sender} એ {recipient} ને {amount} મોકલ્યા.",
        "dot.pop": "પૈસા મેળવવા UPI PIN ક્યારેય દાખલ કરશો નહીં.",
        "qr.safe": "આ QR કોડ સલામત લાગે છે.",
        "qr.fake": "આ QR કોડ નકલી હોઈ શકે છે.",
        "qr.collect": "આ એક કલેક્ટ રિક્વેસ્ટ છે.",
        "pin.private": "તમારો UPI PIN ખાનગી છે.",
        "screen.share": "PIN દાખલ કરતી વખતે સ્ક્રીન શેર કરશો નહીં.",
        "voice.on": "વૉઇસ ગાઇડન્સ ચાલુ છે.",
        "voice.off": "વૉઇસ ગાઇડન્સ બંધ છે.",
    },
    "bn": {
        "pay.success": "{recipient} কে {amount} এর পেমেন্ট সফল হয়েছে।",
        "pay.received": "আপনি {sender} থেকে {amount} পেয়েছেন।",
        "pay.wait.confirm": "{recipient} কে {amount} দেওয়ার জন্য আপনার নিশ্চিতকরণ প্রয়োজন।",
        "pay.notify": "সাথী {recipient} কে {amount} পেমেন্ট নিশ্চিত করেছে।",
        "pay.trusted": "সাথীর বার্তা: {sender} {recipient} কে {amount} পাঠিয়েছেন।",
        "dot.pop": "টাকা নিতে কখনও UPI PIN লিখবেন না।",
        "qr.safe": "এই QR কোডটি নিরাপদ দেখাচ্ছে।",
        "qr.fake": "এই QR কোডটি নকল হতে পারে।",
        "qr.collect": "এটি একটি কালেক্ট রিকোয়েস্ট।",
        "pin.private": "আপনার UPI PIN ব্যক্তিগত।",
        "screen.share": "PIN দেওয়ার সময় স্ক্রিন শেয়ার করবেন না।",
        "voice.on": "ভয়েস গাইডেন্স চালু আছে।",
        "voice.off": "ভয়েস গাইডেন্স বন্ধ আছে।",
    },
    "kn": {
        "pay.success": "{recipient} ಗೆ {amount} ಪಾವತಿ ಯಶಸ್ವಿಯಾಗಿದೆ.",
        "pay.received": "ನಿಮಗೆ {sender} ರಿಂದ {amount} ಸಿಕ್ಕಿದೆ.",
        "pay.wait.confirm": "{recipient} ಗೆ {amount} ಪಾವತಿಸಲು ನಿಮ್ಮ ದೃಢೀಕರಣ ಅಗತ್ಯವಿದೆ.",
        "pay.notify": "ಸಾಥಿ {recipient} ಗೆ {amount} ಪಾವತಿಯನ್ನು ದೃಢಪಡಿಸಿದ್ದಾರೆ.",
        "pay.trusted": "ಸಾಥಿ ಮಾಹಿತಿ: {sender} {recipient} ಗೆ {amount} ಕಳುಹಿಸಿದ್ದಾರೆ.",
        "dot.pop": "ಹಣ ಪಡೆಯಲು UPI PIN ಅನ್ನು ಎಂದಿಗೂ ನಮೂದಿಸಬೇಡಿ.",
        "qr.safe": "ಈ QR ಕೋಡ್ ಸುರಕ್ಷಿತವಾಗಿ ಕಾಣುತ್ತಿದೆ.",
        "qr.fake": "ಈ QR ಕೋಡ್ ನಕಲಿಯಾಗಿರಬಹುದು.",
        "qr.collect": "ಇದು ಕಲೆಕ್ಟ್ ರಿಕ್ವೆಸ್ಟ್ ಆಗಿದೆ.",
        "pin.private": "ನಿಮ್ಮ UPI PIN ಖಾಸಗಿ.",
        "screen.share": "PIN ನಮೂದಿಸುವಾಗ ಸ್ಕ್ರೀನ್ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.",
        "voice.on": "ಧ್ವನಿ ಮಾರ್ಗದರ್ಶನ ಆನ್ ಆಗಿದೆ.",
        "voice.off": "ಧ್ವನಿ ಮಾರ್ಗದರ್ಶನ ಆಫ್ ಆಗಿದೆ.",
    },
    "ml": {
        "pay.success": "{recipient} ന് {amount} പേയ്മെന്റ് വിജയകരമായി.",
        "pay.received": "നിങ്ങൾക്ക് {sender} ൽ നിന്ന് {amount} ലഭിച്ചു.",
        "pay.wait.confirm": "{recipient} ന് {amount} നൽകാൻ നിങ്ങളുടെ സ്ഥിരീകരണം ആവശ്യമാണ്.",
        "pay.notify": "സാഥി {recipient} ന് {amount} പേയ്മെന്റ് സ്ഥിരീകരിച്ചു.",
        "pay.trusted": "സാഥി അറിയിപ്പ്: {sender} {recipient} ന് {amount} അയച്ചു.",
        "dot.pop": "പണം സ്വീകരിക്കാൻ UPI PIN ഒരിക്കലും നൽകരുത്.",
        "qr.safe": "ഈ QR കോഡ് സുരക്ഷിതമാണെന്ന് തോന്നുന്നു.",
        "qr.fake": "ഈ QR കോഡ് വ്യാജമായിരിക്കാം.",
        "qr.collect": "ഇത് ഒരു കലക്ട് റിക്വസ്റ്റ് ആണ്.",
        "pin.private": "നിങ്ങളുടെ UPI PIN സ്വകാര്യമാണ്.",
        "screen.share": "PIN നൽകുമ്പോൾ സ്ക്രീൻ പങ്കിടരുത്.",
        "voice.on": "വോയ്സ് ഗൈഡൻസ് ഓണാണ്.",
        "voice.off": "വോയ്സ് ഗൈഡൻസ് ഓഫാണ്.",
    },
    "pa": {
        "pay.success": "{recipient} ਨੂੰ {amount} ਦਾ ਭੁਗਤਾਨ ਸਫਲ ਰਿਹਾ।",
        "pay.received": "ਤੁਹਾਨੂੰ {sender} ਤੋਂ {amount} ਮਿਲੇ।",
        "pay.wait.confirm": "{recipient} ਨੂੰ {amount} ਦੇਣ ਲਈ ਤੁਹਾਡੀ ਪੁਸ਼ਟੀ ਦੀ ਲੋੜ ਹੈ।",
        "pay.notify": "ਸਾਥੀ ਨੇ {recipient} ਨੂੰ {amount} ਦੇ ਭੁਗਤਾਨ ਦੀ ਪੁਸ਼ਟੀ ਕੀਤੀ।",
        "pay.trusted": "ਸਾਥੀ ਦੀ ਜਾਣਕਾਰੀ: {sender} ਨੇ {recipient} ਨੂੰ {amount} ਭੇਜੇ।",
        "dot.pop": "ਪੈਸੇ ਲੈਣ ਲਈ ਕਦੇ ਵੀ UPI PIN ਨਾ ਪਾਓ।",
        "qr.safe": "ਇਹ QR ਕੋਡ ਸੁਰੱਖਿਅਤ ਲੱਗਦਾ ਹੈ।",
        "qr.fake": "ਇਹ QR ਕੋਡ ਨਕਲੀ ਹੋ ਸਕਦਾ ਹੈ।",
        "qr.collect": "ਇਹ ਇੱਕ ਕਲੈਕਟ ਰੀਕਵੈਸਟ ਹੈ।",
        "pin.private": "ਤੁਹਾਡਾ UPI PIN ਨਿੱਜੀ ਹੈ।",
        "screen.share": "PIN ਪਾਉਂਦੇ ਸਮੇਂ ਸਕ੍ਰੀਨ ਸਾਂਝੀ ਨਾ ਕਰੋ।",
        "voice.on": "ਵੌਇਸ ਗਾਈਡੈਂਸ ਚਾਲੂ ਹੈ।",
        "voice.off": "ਵੌਇਸ ਗਾਈਡੈਂਸ ਬੰਦ ਹੈ।",
    },
    "raj": {
        "pay.success": "{recipient} को {amount} रा भुगतान सफल रह्या।",
        "pay.received": "आपने {sender} से {amount} मिल्या।",
        "pay.wait.confirm": "{recipient} को {amount} दे नै आपरी पुष्टि री जरूरत है।",
        "pay.notify": "साथी ने {recipient} को {amount} रा भुगतान री पुष्टि कर दी।",
        "pay.trusted": "साथी री जाणकारी: {sender} ने {recipient} को {amount} भेज्या।",
        "dot.pop": "पैसे लेणै री खातिर कदी UPI PIN ना डाळो।",
        "qr.safe": "यो QR कोड सुरक्षित लागै है।",
        "qr.fake": "यो QR कोड नकली हो सकै है।",
        "qr.collect": "यो एक कलेक्ट रिक्वेस्ट है।",
        "pin.private": "आपरो UPI PIN निजी है।",
        "screen.share": "PIN डाळणै बेर स्क्रीन शेयर ना करो।",
        "voice.on": "वॉइस गाइडेंस चालू है।",
        "voice.off": "वॉइस गाइडेंस बंद है।",
    },
}

LANGUAGES = [
    {"code": "en", "name": "English", "nativeName": "English"},
    {"code": "hi", "name": "Hindi", "nativeName": "हिन्दी"},
    {"code": "mr", "name": "Marathi", "nativeName": "मराठी"},
    {"code": "ta", "name": "Tamil", "nativeName": "தமிழ்"},
    {"code": "te", "name": "Telugu", "nativeName": "తెలుగు"},
    {"code": "gu", "name": "Gujarati", "nativeName": "ગુજરાતી"},
    {"code": "bn", "name": "Bengali", "nativeName": "বাংলা"},
    {"code": "kn", "name": "Kannada", "nativeName": "ಕನ್ನಡ"},
    {"code": "ml", "name": "Malayalam", "nativeName": "മലയാളം"},
    {"code": "pa", "name": "Punjabi", "nativeName": "ਪੰਜਾਬੀ"},
    {"code": "raj", "name": "Rajasthani", "nativeName": "राजस्थानी"},
]

DEMO_PHRASES: dict[str, str] = {
    "en": "I will show you before you pay.",
    "hi": "आपके पैसे देने से पहले मैं आपको दिखाऊँगा।",
    "mr": "तुम्ही पैसे देण्याआधी मी तुम्हाला दाखवतो.",
    "ta": "நீங்கள் பணம் செலுத்தும் முன் நான் உங்களுக்குக் காண்பிக்கிறேன்.",
    "te": "మీరు చెల్లించే ముందు నేను మీకు చూపిస్తాను.",
    "gu": "તમે પૈસા ચૂકવો તે પહેલાં હું તમને બતાવીશ.",
    "bn": "আপনি টাকা দেওয়ার আগে আমি আপনাকে দেখাব।",
    "kn": "ನೀವು ಹಣ ಪಾವತಿಸುವ ಮೊದಲು ನಾನು ನಿಮಗೆ ತೋರಿಸುತ್ತೇನೆ.",
    "ml": "നിങ്ങൾ പണം നൽകുന്നതിന് മുമ്പ് ഞാൻ കാണിച്ചുതരാം.",
    "pa": "ਤੁਸੀਂ ਪੈਸੇ ਦੇਣ ਤੋਂ ਪਹਿਲਾਂ ਮੈਂ ਤੁਹਾਨੂੰ ਦਿਖਾਵਾਂਗਾ।",
    "raj": "आप पैसे देणै से पैलै मैं आपने दिखाऊँ।",
}

PHRASE_KEYS: dict[str, str] = {
    "I will show you before you pay.": "demo.phrase",
    "Never enter your UPI PIN to receive money.": "dot.pop",
    "Payment of {amount} to {recipient} was successful.": "pay.success",
    "Saathi confirmed your payment of {amount} to {recipient}.": "pay.notify",
}


def localize(language: str, text: str) -> str:
    """Localize ``text`` when it matches a known phrase, otherwise echo it back
    so the returned string is always exactly what a caller asked to display or
    speak."""
    if text in PHRASE_KEYS:
        return translate(language, PHRASE_KEYS[text])
    return text


def translate(language: str, key: str, **kwargs) -> str:
    """Translate ``key`` into ``language`` interpolating ``kwargs``.

    Falls back to English, then to the raw key, so a missing translation never
    raises or returns a broken string.
    """
    if key == "demo.phrase":
        return DEMO_PHRASES.get(language) or DEMO_PHRASES["en"]
    table = CATALOGUE.get(language) or {}
    template = table.get(key) or CATALOGUE["en"].get(key) or key
    try:
        return template.format(**kwargs) if kwargs else template
    except (KeyError, ValueError):
        return template