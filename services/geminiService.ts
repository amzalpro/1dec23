
import { GoogleGenAI, Modality } from "@google/genai";

// Removed conflicting global declaration for window.aistudio to fix TS error.
// We will access aistudio via (window as any).aistudio.

const apiKey = process.env.API_KEY;
// Ideally we would handle the missing key gracefully in the UI, 
// but per instructions we assume it's available.
// Global instance for standard calls (Text, basic Image)
const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy' });

// --- COMMON PROMPTS ---
const HTML_FORMAT_INSTRUCTION = `Retourne UNIQUEMENT le code HTML brut (avec <style> et <script> inclus) sans balises markdown ni \`\`\`html.`;
const STYLE_INSTRUCTION = `
IMPORTANT - CHARTE GRAPHIQUE OBLIGATOIRE (Modern Science/Industrial):
Utilise impérativement ce style CSS dans la balise <style>:
:root { --primary: #4f46e5; --primary-hover: #4338ca; --bg: #ffffff; --text: #1e293b; --border: #e2e8f0; --success: #16a34a; --error: #dc2626; }
body { margin: 0; padding: 10px; width: 100%; height: 100vh; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: 'Inter', system-ui, sans-serif; background-color: var(--bg); color: var(--text); box-sizing: border-box; }
* { box-sizing: border-box; }
h2 { font-size: 1.2rem; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; text-align: center; margin-bottom: 1rem; }
button { background: var(--primary); color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.15); }
button:hover { background: var(--primary-hover); transform: translateY(-1px); box-shadow: 0 4px 6px rgba(79, 70, 229, 0.2); }
button:disabled { background: #cbd5e1; cursor: not-allowed; transform: none; }
.card { background: white; border: 1px solid var(--border); border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); width: 95%; max-width: 100%; max-height: 95vh; overflow-y: auto; }
`;

// --- HELPERS ---

function pcmToWav(base64Pcm: string, sampleRate: number = 24000): string {
    const binaryString = atob(base64Pcm);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);

    // RIFF identifier
    writeString(view, 0, 'RIFF');
    // file length
    view.setUint32(4, 36 + bytes.length, true);
    // RIFF type
    writeString(view, 8, 'WAVE');
    // format chunk identifier
    writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, 1, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sampleRate * blockAlign)
    view.setUint32(28, sampleRate * 2, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, bytes.length, true);

    // Combine header and data
    const wavBytes = new Uint8Array(wavHeader.byteLength + bytes.byteLength);
    wavBytes.set(new Uint8Array(wavHeader), 0);
    wavBytes.set(bytes, wavHeader.byteLength);

    // Convert back to base64
    let binary = '';
    const lenWav = wavBytes.byteLength;
    for (let i = 0; i < lenWav; i++) {
        binary += String.fromCharCode(wavBytes[i]);
    }
    return btoa(binary);
}

function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}


// --- GENERATORS ---

export const generateEducationalText = async (prompt: string, level: string, type: 'standard' | 'definition' = 'standard', options?: { useSearch?: boolean, useThinking?: boolean }): Promise<string> => {
  if (!apiKey) return "Erreur: Clé API manquante.";
  
  let systemInstruction = `Tu es un assistant pédagogique expert. Niveau: ${level}.`;
  if (type === 'definition') systemInstruction += " Définition claire et académique.";
  else systemInstruction += " Contenu éducatif clair et concis.";

  try {
    let model = 'gemini-2.5-flash-lite'; // Default to fast model
    let config: any = { systemInstruction };

    // Apply advanced configurations
    if (options?.useThinking) {
        // Thinking Mode using Gemini 3 Pro
        model = 'gemini-3-pro-preview';
        config = {
            thinkingConfig: { thinkingBudget: 32768 } // Max budget for deep reasoning
        };
        // Note: systemInstruction might be handled differently or embedded in prompt for thinking models if API creates conflict, 
        // but generally supported in config.
    } else if (options?.useSearch) {
        // Search Grounding using Gemini 2.5 Flash
        model = 'gemini-2.5-flash';
        config = {
            systemInstruction,
            tools: [{ googleSearch: {} }]
        };
    }

    const response = await ai.models.generateContent({ 
        model, 
        contents: `Sujet: ${prompt}.`, 
        config 
    });
    
    // Check for grounding metadata if search was used (optional, usually text contains citations)
    // if (options?.useSearch && response.candidates?.[0]?.groundingMetadata?.groundingChunks) { ... }

    return response.text || "Aucun contenu.";
  } catch (e) { 
      console.error(e);
      return "Erreur lors de la génération."; 
  }
};

export const editImageWithGemini = async (base64Image: string, prompt: string): Promise<string | null> => {
    if (!apiKey) return null;
    try {
        const cleanBase64 = base64Image.includes('base64,') ? base64Image.split('base64,')[1] : base64Image;
        const mimeType = base64Image.match(/data:([^;]+);/)?.[1] || 'image/png';

        // Use Gemini 2.5 Flash Image for editing
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: cleanBase64, mimeType } },
                    { text: `Edit this image: ${prompt}` }
                ]
            }
        });

        // Extract the generated image from response
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (e) {
        console.error("Image editing error:", e);
        return null;
    }
};

export const generateEducationalImage = async (prompt: string): Promise<string | null> => {
  if (!apiKey) return null;
  try {
    const response = await ai.models.generateImages({ model: 'imagen-4.0-generate-001', prompt: `Illustration pédagogique scolaire, style clair: ${prompt}`, config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '4:3' } });
    return response.generatedImages?.[0]?.image?.imageBytes ? `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}` : null;
  } catch (e) { return null; }
};

export const generatePageTexture = async (prompt: string): Promise<string | null> => {
    if (!apiKey) return null;
    try {
      const response = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: `Background texture, seamless pattern, subtle, educational stationery style: ${prompt}`,
          config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '3:4' }
      });
      return response.generatedImages?.[0]?.image?.imageBytes ? `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}` : null;
    } catch (e) { return null; }
};

export const generateEducationalVideo = async (prompt: string, aspectRatio: '16:9' | '9:16' = '16:9'): Promise<string | null> => {
  const win = window as any;
  if (win.aistudio) {
    const hasKey = await win.aistudio.hasSelectedApiKey();
    if (!hasKey) {
        await win.aistudio.openSelectKey();
    }
  }

  const currentApiKey = process.env.API_KEY;
  if (!currentApiKey) return null;

  const localAi = new GoogleGenAI({ apiKey: currentApiKey });

  try {
    let operation = await localAi.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      operation = await localAi.operations.getVideosOperation({operation: operation});
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) return null;

    const response = await fetch(`${downloadLink}&key=${currentApiKey}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (e: any) {
    console.error("Video generation error:", e);
    if (e.message && e.message.includes("Requested entity was not found")) {
        const win = window as any;
        if (win.aistudio) {
            await win.aistudio.openSelectKey();
        }
    }
    return null;
  }
};

export const searchYoutubeVideos = async (query: string): Promise<{title: string, url: string, description: string}[]> => {
    if (!apiKey) return [];
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Trouve 4 vidéos éducatives pertinentes sur YouTube ou autre à propos de : "${query}".
            Retourne UNIQUEMENT un tableau JSON valide.
            Format attendu: [{"title": "Titre", "url": "Lien URL", "description": "Court résumé"}]
            N'ajoute pas de texte avant ou après le JSON.`,
            config: {
                tools: [{ googleSearch: {} }],
            }
        });
        
        let text = response.text || "[]";
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        if (text) {
            return JSON.parse(text);
        }
        return [];
    } catch (e) {
        console.error("Video search error", e);
        return [];
    }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
    if (!apiKey) return null;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: { parts: [{ text: text }] },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const rawPcm = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!rawPcm) return null;

        const wavBase64 = pcmToWav(rawPcm, 24000);
        return `data:audio/wav;base64,${wavBase64}`;
    } catch (e) {
        console.error("Speech generation error:", e);
        return null;
    }
};

export const generateEducationalSvg = async (prompt: string): Promise<string> => {
  if (!apiKey) return "";
  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Illustration SVG vectorielle pédagogique sur: ${prompt}. viewBox défini, width/height 100%. Code SVG brut uniquement.` });
    return (response.text || "").replace(/```xml/g, '').replace(/```svg/g, '').replace(/```/g, '');
  } catch (e) { return ""; }
};

export const generateMiniApp = async (prompt: string): Promise<string> => {
  if (!apiKey) return "";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Crée une mini app HTML/JS (Single File) sur: ${prompt}.
      ${STYLE_INSTRUCTION}
      ${HTML_FORMAT_INSTRUCTION}`
    });
    return (response.text || "").replace(/```html/g, '').replace(/```/g, '');
  } catch (e) { return "Erreur."; }
};

export const generateFillInTheBlanks = async (prompt: string): Promise<string> => {
    if (!apiKey) return "";
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Exercice texte à trous HTML/JS sur: "${prompt}".
        ${STYLE_INSTRUCTION}
        ${HTML_FORMAT_INSTRUCTION}`
      });
      return (response.text || "").replace(/```html/g, '').replace(/```/g, '');
    } catch (e) { return "Erreur."; }
};

export const generateMatchingExercise = async (prompt: string): Promise<string> => {
    if (!apiKey) return "";
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Exercice d'appariement HTML/JS sur le thème: "${prompt}".
        ${STYLE_INSTRUCTION}
        ${HTML_FORMAT_INSTRUCTION}`
      });
      return (response.text || "").replace(/```html/g, '').replace(/```/g, '');
    } catch (e) { return "Erreur."; }
};

export const generateTimeline = async (prompt: string): Promise<string> => {
    if (!apiKey) return "";
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Frise chronologique verticale HTML/CSS sur: "${prompt}".
        ${STYLE_INSTRUCTION}
        ${HTML_FORMAT_INSTRUCTION}`
      });
      return (response.text || "").replace(/```html/g, '').replace(/```/g, '');
    } catch (e) { return "Erreur."; }
};

export const generateFlashcards = async (prompt: string): Promise<string> => {
    if (!apiKey) return "";
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Set de 5 Flashcards (recto-verso) HTML/CSS/JS sur: "${prompt}".
        Effet flip au clic.
        ${STYLE_INSTRUCTION}
        ${HTML_FORMAT_INSTRUCTION}`
      });
      return (response.text || "").replace(/```html/g, '').replace(/```/g, '');
    } catch (e) { return "Erreur."; }
};

export const generateTrueFalse = async (prompt: string): Promise<string> => {
    if (!apiKey) return "";
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Quiz Vrai/Faux (5 questions) HTML/CSS/JS sur: "${prompt}".
        ${STYLE_INSTRUCTION}
        ${HTML_FORMAT_INSTRUCTION}`
      });
      return (response.text || "").replace(/```html/g, '').replace(/```/g, '');
    } catch (e) { return "Erreur."; }
};

export const generateMindMap = async (prompt: string): Promise<string> => {
    if (!apiKey) return "";
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Carte mentale (Mind Map) en HTML/CSS/JS sur: "${prompt}".
        Utilise une bibliothèque légère ou du SVG inline.
        Doit être interactive (zoom/pan si possible).
        Assure toi que tout le CSS est dans <style> et ne casse pas le layout parent.
        Format fichier unique HTML.
        ${STYLE_INSTRUCTION}
        ${HTML_FORMAT_INSTRUCTION}`
      });
      return (response.text || "").replace(/```html/g, '').replace(/```/g, '');
    } catch (e) { return "Erreur."; }
};

export const generate3DModel = async (prompt: string): Promise<string> => {
    if (!apiKey) return "";
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Génère un modèle 3D simplifié au format STL (ASCII) représentant : ${prompt}.
        IMPORTANT:
        1. Retourne UNIQUEMENT le contenu brut du fichier STL ASCII.
        2. Le fichier doit commencer par "solid name" et finir par "endsolid name".
        3. N'ajoute aucun texte, markdown, ou explication avant ou après.
        4. Assure-toi que la géométrie est valide et simple.`
      });
      
      let stl = response.text || "";
      stl = stl.replace(/```(?:stl)?/gi, '').replace(/```/g, '').trim();
      
      const solidIndex = stl.toLowerCase().indexOf('solid');
      if (solidIndex > -1) {
          stl = stl.substring(solidIndex);
      }
      
      return stl;
    } catch (e) { return ""; }
};

export const generateCoverPage = async (title: string, subtitle: string, author: string, description: string): Promise<string> => {
  if (!apiKey) return "";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Code HTML/CSS Page de garde A4: ${title}, ${subtitle}, ${author}. Style: ${description}. 100% width/height. ${HTML_FORMAT_INSTRUCTION}`
    });
    return (response.text || "").replace(/```html/g, '').replace(/```/g, '');
  } catch (e) { return "Erreur."; }
};

export const generateQCM = async (prompt: string, level: string, count: number = 3): Promise<string> => {
  if (!apiKey) return "[]";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Génère un QCM de ${count} questions sur: ${prompt}. Niveau ${level}. JSON array format only.`,
      config: { responseMimeType: "application/json" }
    });
    return response.text || "[]";
  } catch (e) { return "[]"; }
};

export const generateConnectDots = async (prompt: string): Promise<string> => {
    if (!apiKey) return "[]";
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Crée un jeu de points à relier pour former un dessin de : ${prompt}.
            Retourne UNIQUEMENT un tableau JSON de coordonnées.
            Format: [{"x": number, "y": number, "label": number}, ...]
            Les coordonnées x et y doivent être entre 10 et 90 (pour cent).
            L'ordre du tableau doit suivre l'ordre du tracé.`,
            config: { responseMimeType: "application/json" }
        });
        return response.text || "[]";
    } catch (e) { return "[]"; }
};

export const analyzeAndImproveText = async (text: string): Promise<string> => {
    if (!apiKey) return text;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Améliore ce texte (style scolaire): ${text}` });
        return response.text || text;
    } catch (e) { return text; }
}

export const modifyCodeWithAI = async (currentCode: string, instruction: string): Promise<string> => {
  if (!apiKey) return currentCode;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Tu es un expert en code HTML/CSS/JS et données JSON.
      Voici un contenu existant (HTML ou JSON) :
      \`\`\`
      ${currentCode}
      \`\`\`
      
      INSTRUCTION DE MODIFICATION : ${instruction}
      
      Si c'est du HTML : Réécris le code complet en appliquant la modification. Retourne UNIQUEMENT le code HTML brut (avec <style> et <script> si nécessaire).
      Si c'est du JSON : Réécris le JSON complet modifié. Retourne UNIQUEMENT le JSON brut.
      Ne mets PAS de balises markdown ni d'explications.`
    });
    return (response.text || "").replace(/```html/g, '').replace(/```json/g, '').replace(/```/g, '').trim();
  } catch (e) { return currentCode; }
};
