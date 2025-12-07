import { SystemConfig } from "../types";

const JSONBIN_API_URL = "https://api.jsonbin.io/v3/b";

/**
 * Uploads the entire application state to JSONBin.io
 * If binId is provided, it updates that bin (PUT).
 * If binId is MISSING or INVALID, it creates a new bin (POST) and returns the ID.
 */
export const saveToCloud = async (
  config: SystemConfig, 
  data: any
): Promise<{ success: boolean; newBinId?: string }> => {
  // Use config.cloudApiKey strictly for JSONBin
  if (!config.cloudApiKey) {
    throw new Error("Chưa nhập JSONBin Master Key.");
  }

  const apiKey = config.cloudApiKey.trim();
  
  // Quick check: If user pasted a Google Key (starts with AIza), warn them immediately
  if (apiKey.startsWith("AIza")) {
      throw new Error("Đồng chí đang nhập nhầm Google API Key! Hãy dùng Master Key từ JSONBin.io để lưu trữ.");
  }

  let binId = config.cloudBinId ? config.cloudBinId.trim() : "";

  // SAFETY CHECK: Handle cases where binId might be string "null", "undefined" or too short
  if (binId.toLowerCase() === "null" || binId.toLowerCase() === "undefined" || binId.length < 5) {
      binId = "";
  }

  // SOFT VALIDATION: If Bin ID contains invalid characters, treat it as empty (Create New) 
  // instead of throwing an error. This ensures data is saved even if the ID is messy.
  if (binId && !/^[a-zA-Z0-9-_]+$/.test(binId)) {
      console.warn("Bin ID chứa ký tự lạ, hệ thống sẽ tự động tạo Bin mới thay thế.");
      binId = "";
  }

  // DETERMINATION: CREATE (POST) OR UPDATE (PUT)
  let isCreation = binId === ""; // Strictly empty means create
  
  let url = isCreation ? JSONBIN_API_URL : `${JSONBIN_API_URL}/${binId}`;
  let method = isCreation ? 'POST' : 'PUT';
  
  const headers: any = {
      'Content-Type': 'application/json',
      'X-Master-Key': apiKey
  };
  
  if (isCreation) {
      headers['X-Bin-Name'] = 'Exam_System_Data'; // Name for easy identification
      headers['X-Bin-Private'] = 'true'; // Default to private
  } else {
      headers['X-Bin-Versioning'] = 'false'; // Disable versioning on updates to save space
  }

  try {
      let response = await fetch(url, {
        method: method,
        headers: headers,
        body: JSON.stringify(data)
      });

      // AUTO-RECOVERY: If Update fails with 404 (Not Found) or 400 (Bad Request), try creating a new one
      if (!isCreation && (response.status === 404 || response.status === 400)) {
          console.warn(`Bin ID ${binId} failed (${response.status}). Attempting to create new bin...`);
          
          // Switch to creation mode
          isCreation = true;
          url = JSONBIN_API_URL;
          method = 'POST';
          
          // Reset headers for creation
          headers['X-Bin-Name'] = 'Exam_System_Data';
          headers['X-Bin-Private'] = 'true';
          delete headers['X-Bin-Versioning']; // Remove versioning header meant for PUT

          // Retry request
          response = await fetch(url, {
            method: method,
            headers: headers,
            body: JSON.stringify(data)
          });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.message || response.statusText;
        
        if (response.status === 401) throw new Error(`Sai Key (401): Master Key không đúng. Lưu ý: Key này lấy từ JSONBin.io, KHÁC với Key của Google AI.`);
        if (response.status === 403) throw new Error(`Không có quyền (403): ${errorMsg}`);
        if (response.status === 404 || response.status === 400) {
            throw new Error(`Lỗi Bin ID (${response.status}): ID không tồn tại hoặc sai định dạng.`);
        }
        
        throw new Error(`Lỗi Cloud (${response.status}): ${errorMsg}`);
      }

      const result = await response.json();

      // If we created a new bin (initially or via recovery), extract the ID
      if (isCreation) {
          if (result.metadata && result.metadata.id) {
              return { success: true, newBinId: result.metadata.id };
          } else if (result.id) {
              return { success: true, newBinId: result.id };
          }
      }

      return { success: true };
  } catch (error: any) {
      console.error("SaveToCloud Error:", error);
      throw error;
  }
};

/**
 * Downloads application state from JSONBin.io
 */
export const loadFromCloud = async (
  config: SystemConfig
): Promise<any> => {
  if (!config.cloudBinId || !config.cloudApiKey) {
    throw new Error("Cần có cả Bin ID và API Key để tải về.");
  }

  const binId = config.cloudBinId.trim();
  const apiKey = config.cloudApiKey.trim();
  const url = `${JSONBIN_API_URL}/${binId}`;

  try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Master-Key': apiKey,
          'X-Bin-Meta': 'false' // Return record data directly without metadata wrapper
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.message || response.statusText;
        
        if (response.status === 401) throw new Error(`Sai Key (401): Master Key không đúng. Vui lòng kiểm tra lại.`);
        if (response.status === 404 || response.status === 400) {
             throw new Error(`Bin ID không tồn tại (${response.status}). Vui lòng kiểm tra lại hoặc Xóa trắng để tạo mới.`);
        }
        throw new Error(`Lỗi tải Cloud (${response.status}): ${errorMsg}`);
      }

      const result = await response.json();
      return result.record || result; 
  } catch (error: any) {
      console.error("LoadFromCloud Error", error);
      throw error;
  }
};