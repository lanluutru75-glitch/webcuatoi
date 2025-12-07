import { GoogleGenAI, Part, Tool, Type } from "@google/genai";
import { Question, SystemConfig, TopicConfig } from "../types";

// Sử dụng model ổn định cho các tác vụ văn bản cơ bản
const MODEL_NAME = 'gemini-2.5-flash';

export const generateExamQuestions = async (
  config: SystemConfig,
  topicConfig: TopicConfig,
  genMode: 'topic' | 'file',
  examContent: string,
  fileBase64: string | null,
  fileType: string | null,
  filePointConfig: Record<string, number>
): Promise<Question[]> => {
  if (!config.apiKey) {
    throw new Error("Vui lòng nhập API Key");
  }

  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  
  const commonInstruction = `
    LƯU Ý QUAN TRỌNG: 
    - Đây là hệ thống thi của quân đội. 
    - Trong nội dung câu hỏi, đáp án hoặc các tình huống giả định, HÃY SỬ DỤNG DANH XƯNG "ĐỒNG CHÍ" LÀM MẶC ĐỊNH.
    - Văn phong cần trang trọng, nghiêm túc, chuẩn mực.
  `;

  let promptParts: Part[] = [];

  if (genMode === 'file') {
    const prompt = `
      ${commonInstruction}
      Trích xuất câu hỏi từ dữ liệu đầu vào. 
      1. Phân loại chính xác 'type': 'single', 'multiple', 'short', 'fill', 'essay'.
      2. Tự đánh giá độ khó 'difficulty': 'easy', 'medium', 'hard'.
      3. GÁN ĐIỂM (points) BẮT BUỘC theo cấu hình sau: 
          - Single (Trắc nghiệm 1 đáp án): ${filePointConfig.single} điểm.
          - Multiple (Nhiều đáp án): ${filePointConfig.multiple} điểm.
          - Short (Trả lời ngắn): ${filePointConfig.short} điểm.
          - Fill (Điền từ): ${filePointConfig.fill} điểm.
          - Essay (Tự luận): ${filePointConfig.essay} điểm.
      4. ĐỐI VỚI CÂU TỰ LUẬN (essay): Trường 'correct_answer' PHẢI chứa dàn ý trả lời chi tiết hoặc đáp án gợi ý để giáo viên chấm điểm.
    `;
    
    if (examContent) {
      promptParts.push({ text: `${prompt}\n\nNỘI DUNG VĂN BẢN:\n${examContent}` });
    } else if (fileBase64 && fileType) {
       promptParts.push({ text: prompt });
       promptParts.push({ 
         inlineData: { 
           mimeType: fileType, 
           data: fileBase64 
         } 
       });
    } else {
      throw new Error("Vui lòng nhập nội dung hoặc tải file");
    }

  } else {
    const totalQuestionsCount = Object.values(topicConfig.typeCounts).reduce((a, b) => a + b, 0);
    const diffStr = topicConfig.difficulty === 'mixed' 
      ? `(Phân bố độ khó: Dễ ~${topicConfig.diffCounts.easy}%, TB ~${topicConfig.diffCounts.medium}%, Khó ~${topicConfig.diffCounts.hard}%)` 
      : `(Độ khó: ${topicConfig.difficulty})`;

    const prompt = `
      ${commonInstruction}
      Đóng vai Chuyên gia Giáo dục/Quân sự. Hãy soạn thảo một đề thi CHẤT LƯỢNG CAO.
      
      CHỦ ĐỀ: ${topicConfig.subject}
      NỘI DUNG CỤ THỂ: ${topicConfig.lesson}
      ${diffStr}
      
      YÊU CẦU SỐ LƯỢNG CÂU HỎI & ĐIỂM SỐ CHÍNH XÁC:
      1. ${topicConfig.typeCounts.single} câu Trắc nghiệm 1 đáp án (type: 'single') - ${topicConfig.typePoints.single} điểm/câu.
      2. ${topicConfig.typeCounts.multiple} câu Trắc nghiệm nhiều đáp án (type: 'multiple') - ${topicConfig.typePoints.multiple} điểm/câu.
      3. ${topicConfig.typeCounts.short} câu Trả lời ngắn (type: 'short') - ${topicConfig.typePoints.short} điểm/câu. (Đáp án ngắn gọn, chính xác).
      4. ${topicConfig.typeCounts.fill} câu Điền từ vào chỗ trống (type: 'fill') - ${topicConfig.typePoints.fill} điểm/câu. (Dạng: "... ___ ...", đáp án là từ điền vào).
      5. ${topicConfig.typeCounts.essay} câu Tự luận (type: 'essay') - ${topicConfig.typePoints.essay} điểm/câu. 
         QUAN TRỌNG: Với câu Tự luận, trường 'correct_answer' phải là một đoạn văn bản chứa DÀN Ý TRẢ LỜI CHI TIẾT hoặc CÁC Ý CHÍNH CẦN CÓ để làm barem chấm điểm.

      TỔNG CỘNG: ${totalQuestionsCount} câu.
    `;
    promptParts.push({ text: prompt });
  }

  // Define Schema for Strict JSON Output
  const questionSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.INTEGER },
        type: { type: Type.STRING, enum: ['single', 'multiple', 'short', 'fill', 'essay'] },
        difficulty: { type: Type.STRING, enum: ['easy', 'medium', 'hard'] },
        question: { type: Type.STRING },
        options: { type: Type.ARRAY, items: { type: Type.STRING } },
        correct_answer: { type: Type.STRING },
        points: { type: Type.NUMBER }
      },
      required: ["type", "difficulty", "question", "correct_answer", "points"]
    }
  };

  if (config.fastMode) {
      promptParts.push({ text: "FAST RESPONSE MODE (Brief thinking)." });
  }

  const tools: Tool[] = (config.useGoogleSearch && !config.fastMode) ? [{ googleSearch: {} }] : [];

  const generationConfig: any = {
    tools: tools,
  };

  // ERROR FIX: Cannot use responseMimeType 'application/json' or responseSchema with tools (googleSearch).
  if (tools.length === 0) {
      generationConfig.responseMimeType = 'application/json';
      generationConfig.responseSchema = questionSchema;
  } else {
      // Fallback: Instruct the model to use JSON via prompt text
      promptParts.push({ text: `
        IMPORTANT: You must return the response as a valid JSON array.
        Follow this structure for each item:
        {
          "id": number,
          "type": "single" | "multiple" | "short" | "fill" | "essay",
          "difficulty": "easy" | "medium" | "hard",
          "question": "string",
          "options": ["string"] (optional, required for single/multiple),
          "correct_answer": "string",
          "points": number
        }
        Do not wrap the JSON in markdown code blocks. Return raw JSON only.
      `});
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts: promptParts },
      config: generationConfig
    });

    const text = response.text;
    if (!text) throw new Error("AI không trả về dữ liệu.");

    // Parse JSON safely
    // Even with responseSchema, sometimes the model might wrap in blocks or add whitespace
    const cleanText = text.trim(); 
    
    let parsed;
    try {
        parsed = JSON.parse(cleanText);
    } catch (e) {
        // Fallback cleanup if schema failed to produce pure JSON (rare with gemini-2.5)
        const sanitize = cleanText.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsed = JSON.parse(sanitize);
    }

    if (Array.isArray(parsed)) {
      return parsed.map((q: any) => ({
        ...q,
        id: q.id || Date.now() + Math.random() // Ensure ID existence
      }));
    } else {
      throw new Error("AI trả về định dạng không hợp lệ (không phải mảng câu hỏi).");
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Lỗi không xác định từ Gemini AI");
  }
};