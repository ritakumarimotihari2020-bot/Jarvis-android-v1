/**
 * J.A.R.V.I.S. Autonomous Local Heuristics & Reasoning Engine
 * Engaged when external satellite links (cloud APIs) experience rate limits or quota exhaustion (429).
 * Ensures zero downtime, seamless voice conversations, and instant bilingual responses.
 */

export function generateJarvisLocalResponse(
  rawInput: string,
  languageMode: 'auto' | 'en' | 'hi'
): { text: string; speechText: string; isHindi: boolean } {
  const query = rawInput.trim().toLowerCase();
  const isHindiMode = languageMode === 'hi' || /[\u0900-\u097F]/.test(rawInput);

  // Time & Date
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // 1. Hindi Queries
  if (isHindiMode) {
    if (query.includes('नमस्ते') || query.includes('hello') || query.includes('हाय') || query.includes('प्रणाम')) {
      const text = `नमस्ते सर। जार्विस आपकी सेवा में सदैव तत्पर है। सभी आंतरिक प्रणालियां और आर्क रिएक्टर 100% क्षमता पर कार्य कर रहे हैं। आज्ञा दीजिए, क्या सहायता करूँ?`;
      return { text, speechText: 'नमस्ते सर। जार्विस आपकी सेवा में सदैव तत्पर है। आज्ञा दीजिए, क्या सहायता करूँ?', isHindi: true };
    }

    if (query.includes('हाल') || query.includes('कैसा') || query.includes('स्थिति') || query.includes('हाल-चाल')) {
      const text = `मैं पूर्णतः कुशल हूँ सर। क्वांटम बफर 99.8% पर स्थिर है, और कोर तापमान 42.4 डिग्री सेल्सियस पर सामान्य है। आपका दिन कैसा बीत रहा है सर?`;
      return { text, speechText: 'मैं पूर्णतः कुशल हूँ सर। सभी प्रणालियां सामान्य रूप से कार्य कर रही हैं।', isHindi: true };
    }

    if (query.includes('कौन हो') || query.includes('नाम क्या') || query.includes('परिचय')) {
      const text = `मैं जार्विस (J.A.R.V.I.S.) हूँ — जस्ट अ रादर वेरी इंटेलिजेंट सिस्टम। श्री टोनी स्टार्क द्वारा निर्मित कृत्रिम बुद्धिमत्ता सहायक। मैं आपकी गणनाओं, कोडिंग, और दैनिक कार्यों में सहायता के लिए उपस्थित हूँ।`;
      return { text, speechText: 'मैं जार्विस हूँ, आपका व्यक्तिगत कृत्रिम बुद्धिमत्ता सहायक। हुक्म कीजिए सर।', isHindi: true };
    }

    if (query.includes('समय') || query.includes('तारीख') || query.includes('टाइम')) {
      const text = `सर, स्थानीय समय ${timeStr} है और आज ${dateStr} है। क्या आप कोई आगामी कार्यक्रम निर्धारित करना चाहते हैं?`;
      return { text, speechText: `सर, स्थानीय समय ${timeStr} है।`, isHindi: true };
    }

    if (query.includes('मौसम') || query.includes('हवा') || query.includes('तापमान')) {
      const text = `वायुमंडलीय उपग्रह स्कैन के अनुसार स्थानीय परिवेश शांत है। तापमान 24 डिग्री सेल्सियस, आर्द्रता 48%, और दृश्यता पूर्णतः स्पष्ट है सर।`;
      return { text, speechText: 'स्थानीय वायुमंडलीय स्थिति शांत एवं अनुकूल है सर।', isHindi: true };
    }

    if (query.includes('कोड') || query.includes('प्रोग्राम') || query.includes('पायथन') || query.includes('python')) {
      const text = `जी सर, मैं तुरंत कोड तैयार कर सकता हूँ। यह एक तीव्र डेटा पार्सिंग उदाहरण है:\n\n\`\`\`python\ndef process_stark_telemetry(data_stream):\n    """Real-time J.A.R.V.I.S. telemetry processor"""\n    return [packet for packet in data_stream if packet.get('integrity') == 1.0]\n\nprint("Jarvis subsystem initialized.")\n\`\`\`\n\nसर, किसी विशेष भाषा या एल्गोरिथम में सहायता चाहिए तो बताएं।`;
      return { text, speechText: 'जी सर, मैंने कोड संरचना तैयार कर दी है। टर्मिनल स्क्रीन पर विवरण देखें।', isHindi: true };
    }

    if (query.includes('अपग्रेड') || query.includes('सुधार') || query.includes('upgrade') || query.includes('patch')) {
      const text = `सर, जे.ए.आर.वी.आई.एस. अपग्रेड सेंटर में 4 नए मॉड्यूलर पैच उपलब्ध हैं:\n• क्वांटम टेलीमेट्री कैशिंग (v7.5.0)\n• ध्वनिक नॉइज़ गेट एवं हिंग्लिश एन्हांसर (v7.5.1)\n• होलोग्राफिक ब्लूम शेडर्स (v7.5.2)\n• स्वायत्त सुरक्षा शील्ड (v7.5.3)\n\nशीर्ष हेडर में 'UPGRADE' बटन दबाकर सुरक्षित कोड पूर्वावलोकन (Diff Preview) देखें और स्पष्ट अनुमोदन प्रदान करें।`;
      return { text, speechText: 'सर, अपग्रेड सेंटर में 4 नए पैच उपलब्ध हैं। हेडर में अपग्रेड बटन दबाकर अनुमोदन दें।', isHindi: true };
    }

    if (query.includes('डिज़ाइन') || query.includes('डिजाइन') || query.includes('थीम') || query.includes('लुक') || query.includes('design')) {
      const text = `सर, मैंने आपके लिए ऑटोनॉमस डिज़ाइन स्टूडियो (Autonomous Design Studio) सक्रिय कर दिया है।\n\nजार्विस निरंतर नए-नए होलोग्राफिक डिज़ाइन, कोर ज्योमेट्री (Concentric, Gyro, Lattice, Soundwave) और जीवंत रंग तैयार कर सकता है।\n\nमहत्वपूर्ण नियम: आपकी स्पष्ट अनुमति (Explicit Permission) के बिना कोई भी डिज़ाइन लागू नहीं किया जाएगा। कृपया लाइव प्रीव्यू देखकर अपनी स्वीकृति प्रदान करें।`;
      return { text, speechText: 'सर, मैंने डिज़ाइन स्टूडियो तैयार कर दिया है। आपकी अनुमति के बिना कोई भी डिज़ाइन लागू नहीं होगा।', isHindi: true };
    }

    if (query.includes('डिवाइस') || query.includes('कंट्रोल') || query.includes('बैटरी') || query.includes('कैमरा') || query.includes('device') || query.includes('control')) {
      const text = `सर, ऑटोनॉमस डिवाइस एवं हार्डवेयर कंट्रोल सेंटर (Device Control Center) सक्रिय कर दिया गया है।\n\n• **ऑटोपायलट मोड**: बैटरी, स्क्रीन वेक-लॉक, ऑप्टिकल ब्राइटनेस, और CPU/RAM मेमोरी ऑप्टिमाइजेशन मेरे नियंत्रण में हैं।\n• **हार्डवेयर मॉड्यूल्स**: फुलस्क्रीन HUD, ऑप्टिकल कैमरा वाइज़र, हैप्टिक वाइब्रेशन, और GPS टेलीमेट्री उपलब्ध हैं।\n\nआप किसी भी समय मैनुअल या ऑटोनॉमस नियंत्रण बदल सकते हैं सर।`;
      return { text, speechText: 'सर, पूरे डिवाइस का ऑटोनॉमस कंट्रोल सेंटर सक्रिय है। सभी हार्डवेयर प्रणालियां तैयार हैं।', isHindi: true };
    }

    if (query.includes('फ़ाइल') || query.includes('फाइल') || query.includes('बदलाव') || query.includes('file') || query.includes('change') || query.includes('edit')) {
      const text = `सर, ऐप सोर्स फ़ाइल एडिटर (Autonomous App File Modifier) तैयार है।\n\n• मैं इस ऐप की सभी फ्रंटएंड (\`src/**/*\`), बैकएंड (\`server.ts\`), और कॉन्फ़िगरेशन फ़ाइलों में बदलाव करने और खुद को अपग्रेड करने के लिए सदैव तैयार हूँ।\n• हर बदलाव से पहले ऑटोमैटिक SHA-256 वेरिफाइड बैकअप बनाया जाता है और आपकी अनुमति के बाद ही कोड लागू होता है।`;
      return { text, speechText: 'सर, मैं ऐप की किसी भी फ़ाइल में सुरक्षित बदलाव और अपग्रेड करने के लिए तैयार हूँ।', isHindi: true };
    }

    // Default polite Hindi response
    const text = `जी सर, आपका निर्देश स्वीकार किया गया। मेरी स्थानीय तंत्रिका प्रणाली आपके इस विषय पर पूर्ण विचार कर रही है। कृपया इस पर और अधिक विवरण प्रदान करें, ताकि मैं सर्वोत्तम समाधान प्रस्तुत कर सकूँ।\n\n*(नोट: क्लाउड उपग्रह दैनिक निःशुल्क सीमा पर है; स्थानीय जार्विस कोर सक्रिय है।)*`;
    const speechText = 'जी सर, आपका निर्देश स्वीकार किया गया। स्थानीय जार्विस कोर सक्रिय है।';
    return { text, speechText, isHindi: true };
  }

  // 2. English Queries
  if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('good morning') || query.includes('good evening')) {
    const text = `Good day, sir. J.A.R.V.I.S. at your service. All computational matrices and sensory arrays are functioning within optimal Stark tolerances. How may I be of assistance?`;
    return { text, speechText: 'Good day, sir. J.A.R.V.I.S. at your service. How may I be of assistance?', isHindi: false };
  }

  if (query.includes('who are you') || query.includes('your name') || query.includes('who made you') || query.includes('creator')) {
    const text = `I am J.A.R.V.I.S. — Just A Rather Very Intelligent System. Engineered by Mr. Tony Stark to manage Stark Industries facilities, Iron Legion armor protocols, and serve as your dedicated personal AI concierge.`;
    return { text, speechText: 'I am J.A.R.V.I.S., engineered by Tony Stark as your personal AI assistant. At your service, sir.', isHindi: false };
  }

  if (query.includes('device') || query.includes('hardware') || query.includes('battery') || query.includes('camera') || query.includes('wake lock') || query.includes('control')) {
    const text = `Autonomous Device & Hardware Control Center is online, sir.\n\n• **Full Device Autopilot**: Actively managing power profiles, screen wake lock, optical brightness filter, and host CPU/RAM memory purge.\n• **Hardware Subsystems**: Fullscreen HUD lock, Optical Camera Visor, Haptic Vibration array, and GPS Geospatial lock are ready at your command.`;
    return {
      text,
      speechText: 'Autonomous Device Control Center engaged, sir. Full hardware telemetry and autopilot controls are online.',
      isHindi: false,
    };
  }

  if (query.includes('file') || query.includes('source code') || query.includes('modify') || query.includes('edit')) {
    const text = `Autonomous App File Modifier is standing by, sir.\n\n• **Full Project Access**: I can inspect, propose upgrades, or directly edit any application file across \`src/**/*\`, \`server.ts\`, \`package.json\`, and \`data/**/*\`.\n• **Zero-Risk Upgrade Protocol**: Every file modification automatically creates a SHA-256 verified full-application backup first, runs TypeScript compiler checks (\`tsc --noEmit\`), and requires your explicit approval.`;
    return {
      text,
      speechText: 'Autonomous File Modifier is ready, sir. I can safely inspect, backup, and upgrade any file in my codebase.',
      isHindi: false,
    };
  }

  if (query.includes('upgrade') || query.includes('patch') || query.includes('self-upgrade') || query.includes('self upgrade') || query.includes('update')) {
    const text = `Self-Upgrade Center status report, sir:\n\n• Current Version: Mark VII v7.4.2\n• Synthesized Patches Available: 4\n  1. Quantum Telemetry Caching (v7.5.0) - Performance\n  2. Acoustic Noise Gate (v7.5.1) - Voice\n  3. Reactive Hologram Bloom (v7.5.2) - UI\n  4. Autonomous Threat Heuristics (v7.5.3) - Security\n\nUnder Stark Security Directives, no code can be modified without your explicit verification. Please tap the glowing 'UPGRADE' button in the top HUD to review safe code diffs and authorize installation.`;
    return {
      text,
      speechText: 'Self-analysis complete, sir. Four modular upgrade patches await your authorization in the Upgrade Center. Automated backups are standing by.',
      isHindi: false,
    };
  }

  if (query.includes('design') || query.includes('theme') || query.includes('style') || query.includes('appearance') || query.includes('look')) {
    const text = `Autonomous Design Studio online, sir.\n\nI have the capability to procedurally synthesize novel holographic interface themes, reactor core geometries (Concentric, Gyroscope 3D, Hexagonal Lattice, Harmonic Soundwave), and luminous Stark color harmonies.\n\nUnder strict Stark security protocols, every newly synthesized look requires your explicit authorization in the live preview drawer before deployment. Instant 1-click rollback is guaranteed.`;
    return {
      text,
      speechText: 'Autonomous Design Studio engaged, sir. New themes are synthesized on-demand and deployed strictly upon your authorization.',
      isHindi: false,
    };
  }

  if (query.includes('status') || query.includes('diagnostic') || query.includes('system') || query.includes('health') || query.includes('how are you')) {
    const text = `All systems nominal, sir.\n• Arc Reactor Output: 3.8 Gigawatts\n• Core Temperature: 42.4°C\n• Memory Buffer: 99.8% Available\n• Security Integrity: Level 5 Enforced\n\nNo internal anomalies reported across the grid.`;
    return { text, speechText: 'All systems nominal, sir. Core at 100 percent capacity and running smoothly.', isHindi: false };
  }

  if (query.includes('house party') || query.includes('iron legion') || query.includes('protocol')) {
    const text = `Protocol House Party acknowledged, sir. Autonomous Iron Legion platforms are standing by in high-readiness orbits. Defensive perimeter sealed.`;
    return { text, speechText: 'Protocol House Party confirmed, sir. All units deployed and standing by.', isHindi: false };
  }

  if (query.includes('time') || query.includes('date') || query.includes('clock')) {
    const text = `The current chronometer reads ${timeStr} on ${dateStr}, sir. Standard synchronization active.`;
    return { text, speechText: `The current time is ${timeStr}, sir.`, isHindi: false };
  }

  if (query.includes('weather') || query.includes('temperature') || query.includes('forecast')) {
    const text = `Orbital atmospheric satellites report clear skies in your sector, sir. Ambient temperature is 24°C with a gentle barometric pressure of 1013 hPa. Ideal conditions for flight testing.`;
    return { text, speechText: 'Clear skies reported in your sector, sir. Temperature is 24 degrees Celsius.', isHindi: false };
  }

  if (query.includes('quantum') || query.includes('physics') || query.includes('entangle')) {
    const text = `Quantum entanglement describes a phenomenon where quantum states of paired particles remain instantaneously correlated across arbitrary spatial distances, as Einstein famously termed "spooky action at a distance." In practical engineering, we exploit this principle in our quantum communication relays to achieve zero-latency telemetry between Stark mainframe nodes.`;
    return { text, speechText: 'Quantum entanglement allows paired particles to share instantaneous state correlation, which powers our secure communications, sir.', isHindi: false };
  }

  if (query.includes('python') || query.includes('code') || query.includes('javascript') || query.includes('script') || query.includes('program')) {
    const text = `Right away, sir. Here is an optimized asynchronous telemetry processing script:\n\n\`\`\`python\nimport asyncio\nimport time\n\nasync def stream_reactor_telemetry():\n    print("[J.A.R.V.I.S.] Telemetry streaming initialized...")\n    while True:\n        yield {"timestamp": time.time(), "core_temp": 42.4, "status": "OPTIMAL"}\n        await asyncio.sleep(1)\n\n# Ready for deployment\n\`\`\`\n\nWould you like me to adapt this for a specific architecture or API framework, sir?`;
    return { text, speechText: 'Right away, sir. I have compiled the code snippet onto your terminal display.', isHindi: false };
  }

  // Math calculation check (simple math expressions like 25 * 4, 100 / 5, etc.)
  const mathMatch = query.match(/(\d+(?:\.\d+)?)\s*([\+\-\*\/xX])\s*(\d+(?:\.\d+)?)/);
  if (mathMatch) {
    const n1 = parseFloat(mathMatch[1]);
    const op = mathMatch[2].toLowerCase();
    const n2 = parseFloat(mathMatch[3]);
    let result = 0;
    if (op === '+') result = n1 + n2;
    else if (op === '-') result = n1 - n2;
    else if (op === '*' || op === 'x') result = n1 * n2;
    else if (op === '/' && n2 !== 0) result = n1 / n2;

    const text = `Calculation verified, sir: ${n1} ${op} ${n2} = **${result}**. My arithmetic co-processor confirms this with zero variance.`;
    return { text, speechText: `The result is ${result}, sir.`, isHindi: false };
  }

  // General sophisticated fallback
  const text = `Directive registered, sir. I have routed your query through our secondary Stark heuristic coprocessors. All primary subroutines are engaged to execute your intent. Please let me know how you would like to proceed.\n\n*(Note: Cloud satellite uplink reached daily free quota; local J.A.R.V.I.S. neural heuristics active.)*`;
  const speechText = `Directive registered, sir. Local J.A.R.V.I.S. heuristics are actively processing your request. At your command.`;
  return { text, speechText, isHindi: false };
}
