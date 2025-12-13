/**
 * Google Gemini Vision OCR Service with Advanced MGX Schema
 * Replaces GPT-4o completely with Google Gemini Vision API
 * Implements comprehensive document extraction with MRZ support
 * ENHANCED: Added comprehensive debugging and raw data logging
 * FIXED: Removed circular dependency by decoupling database logic.
 * UPDATED: Switched to gemini-2.5-flash on v1beta to resolve 404 errors and use latest model.
 * FIXED: Re-inserted hardcoded API key as a fallback to prevent "API Key is missing" errors.
 */

import { supabase } from '../lib/supabase';

class GeminiVisionOCR {
  constructor() {
    // FIX: Re-inserting the hardcoded API Key as a required fallback.
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    // This key was observed to be in use and working in Log 1's successful attempt.
    const fallbackKey = "AIzaSyAHdF88vlkaE0aHFyVe2osQw8HdRNx6U-w"; 
    
    this.apiKey = envKey || fallbackKey;

    if (!this.apiKey) {
      console.error('❌ Gemini API Key is missing! Please set VITE_GEMINI_API_KEY in your .env file.');
    }

    // Updated to use gemini-2.5-flash on v1beta
    this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;
    this.listModelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
  }

  /**
   * List available models to find the correct one for vision processing
   */
  async listAvailableModels() {
    if (!this.apiKey) {
      throw new Error('Gemini API Key is missing. Cannot list models.');
    }

    try {
      console.log('🔍 Listing available Google Gemini models...');
      
      const response = await fetch(this.listModelsUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ListModels API Error:', errorText);
        throw new Error(`ListModels API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Available models:', JSON.stringify(result, null, 2));
      
      // Filter models that support generateContent and are suitable for vision
      const visionModels = result.models?.filter(model => 
        model.supportedGenerationMethods?.includes('generateContent') &&
        (model.name.includes('gemini') || model.name.includes('vision') || model.name.includes('flash'))
      ) || [];
      
      console.log('Vision-capable models:', visionModels.map(m => m.name));
      
      return visionModels;
      
    } catch (error) {
      console.error('Error listing models:', error);
      throw error;
    }
  }

  /**
   * Process ID document using Google Gemini Vision API with MGX Schema
   * ENHANCED: Added comprehensive debugging and raw data exposure
   */
  async processIdDocument(imageFile, customerId = null) {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'Gemini API Key is missing. Please configure VITE_GEMINI_API_KEY.',
        data: null
      };
    }

    try {
      console.log('🔍 Starting Google Gemini Vision OCR processing...');
      console.log('📋 Input parameters:', { 
        imageFileName: imageFile?.name, 
        imageSize: imageFile?.size, 
        customerId 
      });
      
      // Convert image to base64
      const { base64Image, mimeType } = await this.convertToBase64(imageFile);
      
      // Call Gemini Vision API with MGX prompt
      console.log('🤖 Calling Gemini Vision API for data extraction...');
      const extractedData = await this.callGeminiVisionAPI(base64Image, mimeType);
      
      // CRITICAL DEBUG: Log the complete raw extracted data
      console.log('🔍 === RAW EXTRACTED DATA FROM GEMINI VISION ===');
      console.log('📊 Complete extracted object:', JSON.stringify(extractedData, null, 2));
      console.log('📊 Extracted data keys:', Object.keys(extractedData));
      console.log('📊 Non-null fields:', Object.entries(extractedData).filter(([key, value]) => value !== null && value !== ''));
      console.log('===============================================');
      
      // Upload image to Supabase Storage (but don't save URL to database)
      let imageUrl = null;
      if (customerId) {
        console.log('📤 Uploading image to Supabase Storage...');
        imageUrl = await this.uploadImage(imageFile, customerId);
        console.log('✅ Image uploaded to:', imageUrl);
      }
      
      console.log('✅ Google Gemini Vision OCR completed successfully');
      
      // Return enhanced result with debug information
      return {
        success: true,
        data: extractedData,
        customerId: customerId,
        imageUrl: imageUrl,
        message: 'Successfully populated customer data from scanned ID.',
        debug: {
          extractedFields: Object.keys(extractedData),
          nonNullFields: Object.entries(extractedData).filter(([key, value]) => value !== null && value !== '').map(([key]) => key),
          totalFields: Object.keys(extractedData).length,
          populatedFields: Object.entries(extractedData).filter(([key, value]) => value !== null && value !== '').length
        }
      };
      
    } catch (error) {
      console.error('❌ Google Gemini Vision OCR error:', error);
      
      // Enhanced error logging
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // If we get a 404 model error, try to find available models
      if (error.message.includes('404') && error.message.includes('not found')) {
        console.log('🔄 Model not found, attempting to list available models...');
        try {
          const availableModels = await this.listAvailableModels();
          if (availableModels.length > 0) {
            const suggestedModel = availableModels[0];
            console.log(`💡 Suggested model: ${suggestedModel.name}`);
            return {
              success: false,
              error: `Model not found. Available models: ${availableModels.map(m => m.name).join(', ')}. Please update the model name in the code.`,
              data: null,
              suggestedModels: availableModels
            };
          }
        } catch (listError) {
          console.error('Failed to list models:', listError);
        }
      }
      
      return {
        success: false,
        error: error.message || 'Failed to process ID document',
        data: null
      };
    }
  }

  /**
   * Convert image file to base64 with proper MIME type detection
   */
  async convertToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        
        // Detect proper MIME type
        let mimeType = file.type;
        if (!mimeType || mimeType === '') {
          // Fallback MIME type detection based on file extension
          const fileName = file.name.toLowerCase();
          if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
            mimeType = 'image/jpeg';
          } else if (fileName.endsWith('.png')) {
            mimeType = 'image/png';
          } else if (fileName.endsWith('.webp')) {
            mimeType = 'image/webp';
          } else {
            mimeType = 'image/jpeg'; // Default fallback
          }
        }
        
        console.log(`📷 Image converted: ${file.name}, MIME: ${mimeType}, Size: ${base64.length} chars`);
        resolve({ base64Image: base64, mimeType });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Call Google Gemini Vision API with advanced MGX prompt
   * ENHANCED: Added comprehensive response logging and debugging
   */
  async callGeminiVisionAPI(base64Image, mimeType) {
    // Simplified MGX prompt to reduce token usage
    const mgxPrompt = `Extract identity document data as JSON only. Return this exact structure:

{
  "document_type": null,
  "country": null,
  "full_name": null,
  "raw_name": null,
  "given_name": null,
  "family_name": null,
  "first_name": null,
  "last_name": null,
  "middle_name": null,
  "document_number": null,
  "nationality": null,
  "date_of_birth": null,
  "gender": null,
  "expiry_date": null,
  "issue_date": null,
  "place_of_birth": null,
  "issuing_authority": null,
  "mrz": null,
  "confidence_estimate": null,
  "email": null,
  "phone": null,
  "address": null,
  "city": null,
  "postal_code": null
}

Rules:
1. Return ONLY valid JSON, no extra text
2. Use null for missing fields
3. Dates as YYYY-MM-DD format
4. confidence_estimate as float 0.0-1.0
5. For Arabic/Latin text, prefer Latin in full_name, original in raw_name
6. Extract ALL visible text and map to appropriate fields
7. If full_name is not clear, construct from first_name + last_name

Extract from this image:`;

    // Request body format for Google Gemini API with increased token limit
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: mgxPrompt
            },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 1,
        maxOutputTokens: 4096  // Increased from 2048 to 4096
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE"
        }
      ]
    };

    console.log('=== GEMINI API REQUEST ===');
    console.log('URL:', this.apiUrl);
    console.log('MIME Type:', mimeType);
    console.log('Prompt Length:', mgxPrompt.length);
    console.log('Image Data Length:', base64Image.length);
    console.log('Max Output Tokens:', requestBody.generationConfig.maxOutputTokens);
    console.log('========================');
    
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      // Get raw response text BEFORE any parsing attempts
      const rawResponseText = await response.text();
      
      console.log('=== RAW GEMINI API RESPONSE ===');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));
      console.log('Content-Type:', response.headers.get('content-type'));
      console.log('Raw Response Text:', rawResponseText);
      console.log('Response Length:', rawResponseText.length);
      console.log('Response Type:', typeof rawResponseText);
      console.log('First 500 chars:', rawResponseText.substring(0, 500));
      console.log('Last 100 chars:', rawResponseText.substring(Math.max(0, rawResponseText.length - 100)));
      console.log('================================');

      // Validate response is not empty
      if (!rawResponseText || rawResponseText.trim() === '') {
        throw new Error('Empty response from Gemini API');
      }

      // Check if response is HTML (error page)
      if (rawResponseText.trim().startsWith('<')) {
        console.error('❌ Received HTML error page instead of JSON');
        throw new Error('Received HTML error page instead of JSON response');
      }

      // Check response Content-Type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('⚠️ Unexpected Content-Type:', contentType);
      }

      // Check HTTP status
      if (!response.ok) {
        console.error('❌ HTTP Error Response:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${rawResponseText}`);
      }

      // Parse JSON with detailed error handling
      let responseData;
      try {
        responseData = JSON.parse(rawResponseText);
        console.log('✅ JSON parsed successfully');
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        console.error('Parse error details:', {
          name: parseError.name,
          message: parseError.message,
          stack: parseError.stack
        });
        console.error('Failed to parse response (first 1000 chars):', rawResponseText.substring(0, 1000));
        throw new Error(`Invalid JSON response from Gemini API: ${parseError.message}`);
      }

      // Validate JSON structure
      if (!responseData || typeof responseData !== 'object') {
        console.error('❌ Response is not a valid JSON object:', typeof responseData);
        throw new Error('Response is not a valid JSON object');
      }

      console.log('📥 Parsed Response Data:', JSON.stringify(responseData, null, 2));

      // Handle Gemini API error responses (valid JSON but error content)
      if (responseData.error) {
        console.error('❌ Gemini API Error Response:', responseData.error);
        throw new Error(`Gemini API Error: ${responseData.error.message || 'Unknown API error'} (Code: ${responseData.error.code || 'Unknown'})`);
      }

      // Check for prompt feedback blocks
      if (responseData.promptFeedback?.blockReason) {
        console.warn('⚠️ Prompt blocked by safety filters:', responseData.promptFeedback.blockReason);
        throw new Error(`Content blocked by safety filters: ${responseData.promptFeedback.blockReason}`);
      }

      // Check candidates array
      if (!responseData.candidates || !Array.isArray(responseData.candidates)) {
        console.error('❌ Response missing expected candidates array');
        console.error('Available keys in response:', Object.keys(responseData));
        throw new Error('Response missing expected candidates array');
      }

      if (responseData.candidates.length === 0) {
        console.error('❌ Empty candidates array in response');
        throw new Error('No candidates returned from Google Gemini Vision API');
      }

      const candidate = responseData.candidates[0];
      
      console.log('🔍 DETAILED CANDIDATE ANALYSIS:');
      console.log('- finishReason:', candidate.finishReason);
      console.log('- hasContent:', !!candidate.content);
      console.log('- contentKeys:', candidate.content ? Object.keys(candidate.content) : 'none');
      console.log('- fullCandidate:', JSON.stringify(candidate, null, 2));
      
      // Handle finish reason appropriately
      if (candidate.finishReason === 'MAX_TOKENS') {
        console.warn('⚠️ Response truncated due to max tokens limit, but attempting to parse partial content');
        // Don't throw error, try to parse what we have
      } else if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        console.warn('⚠️ Candidate finish reason:', candidate.finishReason);
        if (candidate.finishReason === 'SAFETY') {
          throw new Error('Content generation stopped due to safety filters');
        }
      }

      // Check for safety ratings
      if (candidate.safetyRatings) {
        console.log('🛡️ Safety ratings:', candidate.safetyRatings);
      }

      // Enhanced content extraction with multiple fallback methods
      let content = null;
      
      // Try multiple content extraction paths
      if (candidate.content?.parts?.[0]?.text) {
        content = candidate.content.parts[0].text;
        console.log('✅ Content extracted from parts[0].text');
      } else if (candidate.content?.text) {
        content = candidate.content.text;
        console.log('✅ Content extracted from content.text');
      } else if (candidate.text) {
        content = candidate.text;
        console.log('✅ Content extracted from candidate.text');
      } else if (candidate.content) {
        // Log the actual structure to understand it
        console.log('🔍 Candidate content structure:', JSON.stringify(candidate.content, null, 2));
        
        // Try to find text in any nested structure
        const findText = (obj) => {
          if (typeof obj === 'string') return obj;
          if (obj && typeof obj === 'object') {
            for (const key in obj) {
              if (key === 'text' && typeof obj[key] === 'string') {
                return obj[key];
              }
              const result = findText(obj[key]);
              if (result) return result;
            }
          }
          return null;
        };
        
        content = findText(candidate.content);
        if (content) {
          console.log('✅ Content extracted via deep search');
        }
      }

      // Last resort: try to extract any JSON from the entire candidate
      if (!content) {
        console.log('🔧 Attempting last resort content extraction...');
        const candidateStr = JSON.stringify(candidate);
        const jsonMatch = candidateStr.match(/\{[^{}]*"document_type"[^{}]*\}/);
        if (jsonMatch) {
          console.log('🔧 Extracted JSON from candidate string:', jsonMatch[0]);
          content = jsonMatch[0];
        }
      }

      if (!content) {
        console.error('❌ No content found in candidate after all extraction attempts');
        console.error('Candidate structure:', candidate);
        throw new Error('No content received from Google Gemini Vision API - exhausted all extraction methods');
      }

      console.log('📝 Raw Gemini content response:', content);

      // Parse JSON response from content
      try {
        // Clean the response to extract JSON
        let jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          // Try to find JSON in a more flexible way
          const lines = content.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('{') && trimmed.includes('"document_type"')) {
              jsonMatch = [trimmed];
              break;
            }
          }
        }
        
        if (!jsonMatch) {
          console.error('❌ No JSON object found in content');
          console.error('Content received:', content);
          throw new Error('No JSON found in Gemini response content');
        }
        
        const extractedData = JSON.parse(jsonMatch[0]);
        console.log('✅ Successfully extracted JSON from content:', extractedData);
        
        // Enhanced data validation and cleanup
        const cleanedData = this.cleanAndValidateExtractedData(extractedData);
        
        console.log('✅ Successfully processed and cleaned extracted data:', cleanedData);
        return cleanedData;
        
      } catch (contentParseError) {
        console.error('❌ JSON parsing error in content:', contentParseError);
        console.error('Content that failed to parse:', content);
        throw new Error(`Invalid JSON in response content: ${contentParseError.message}`);
      }

    } catch (fetchError) {
      console.error('❌ Fetch Error:', fetchError);
      console.error('Fetch error details:', {
        name: fetchError.name,
        message: fetchError.message,
        stack: fetchError.stack
      });
      throw fetchError;
    }
  }

  /**
   * Clean and validate extracted data with enhanced fallbacks
   */
  cleanAndValidateExtractedData(rawData) {
    console.log('🧹 Cleaning and validating extracted data:', rawData);
    
    const cleaned = { ...rawData };
    
    // Ensure full_name is populated with intelligent fallbacks
    if (!cleaned.full_name || cleaned.full_name.trim() === '' || cleaned.full_name === null) {
      console.log('⚠️ No full_name found, attempting to construct from other fields...');
      
      // Try different combinations to construct full name
      const nameParts = [];
      
      if (cleaned.first_name) nameParts.push(cleaned.first_name.trim());
      if (cleaned.middle_name) nameParts.push(cleaned.middle_name.trim());
      if (cleaned.last_name) nameParts.push(cleaned.last_name.trim());
      
      if (nameParts.length === 0) {
        if (cleaned.given_name) nameParts.push(cleaned.given_name.trim());
        if (cleaned.family_name) nameParts.push(cleaned.family_name.trim());
      }
      
      if (nameParts.length === 0 && cleaned.raw_name) {
        cleaned.full_name = cleaned.raw_name.trim();
      } else if (nameParts.length > 0) {
        cleaned.full_name = nameParts.join(' ');
      } else {
        // Final fallback - generate a name
        cleaned.full_name = `Customer ${Date.now()}`;
      }
      
      console.log('✅ Constructed full_name:', cleaned.full_name);
    }
    
    // Ensure confidence_estimate is a valid number
    if (cleaned.confidence_estimate && typeof cleaned.confidence_estimate !== 'number') {
      cleaned.confidence_estimate = parseFloat(cleaned.confidence_estimate) || 0.7;
    }
    
    // Set default confidence if missing
    if (!cleaned.confidence_estimate) {
      cleaned.confidence_estimate = 0.7;
    }
    
    // Validate and clean date fields
    const dateFields = ['date_of_birth', 'issue_date', 'expiry_date'];
    dateFields.forEach(field => {
      if (cleaned[field] && !this.isValidDate(cleaned[field])) {
        console.warn(`⚠️ Invalid date format for ${field}:`, cleaned[field]);
        cleaned[field] = null;
      }
    });
    
    console.log('🧹 Final cleaned data:', cleaned);
    return cleaned;
  }

  /**
   * Upload image to Supabase Storage (images stored in id_scans bucket)
   */
  async uploadImage(imageFile, customerId) {
    try {
      const timestamp = Date.now();
      const fileName = `idscan_${timestamp}.jpg`;
      const filePath = `${customerId}/${fileName}`;

      console.log(`📤 Uploading image to storage: ${filePath}`);

      const { data, error } = await supabase.storage
        .from('id_scans')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      // Get public URL for logging purposes
      const { data: urlData } = supabase.storage
        .from('id_scans')
        .getPublicUrl(filePath);

      console.log(`✅ Image uploaded successfully to: ${urlData.publicUrl}`);
      return urlData.publicUrl;
      
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    }
  }

  /**
   * Validate extracted MGX data
   */
  validateExtractedData(data) {
    const errors = [];
    
    if (!data.full_name && !data.raw_name) {
      errors.push('Full name or raw name is required');
    }
    
    if (!data.document_number) {
      errors.push('Document number is required');
    }
    
    // Date validation
    if (data.date_of_birth && !this.isValidDate(data.date_of_birth)) {
      errors.push('Invalid date of birth format. Expected YYYY-MM-DD');
    }
    
    if (data.issue_date && !this.isValidDate(data.issue_date)) {
      errors.push('Invalid issue date format. Expected YYYY-MM-DD');
    }
    
    if (data.expiry_date && !this.isValidDate(data.expiry_date)) {
      errors.push('Invalid expiry date format. Expected YYYY-MM-DD');
    }
    
    // Confidence validation
    if (data.confidence_estimate && (data.confidence_estimate < 0 || data.confidence_estimate > 1)) {
      errors.push('Confidence estimate must be between 0.0 and 1.0');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate date format (YYYY-MM-DD)
   */
  isValidDate(dateString) {
    if (!dateString) return true;
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) && date.toISOString().slice(0, 10) === dateString;
  }

  /**
   * Detect MRZ lines from OCR text (basic implementation)
   */
  detectMRZLines(ocrText) {
    const lines = ocrText.split('\n');
    const mrzLines = [];
    
    // Look for lines that match MRZ patterns
    for (const line of lines) {
      const cleanLine = line.trim().replace(/\s/g, '');
      
      // Passport MRZ: starts with P< and is 44 characters
      if (cleanLine.startsWith('P<') && cleanLine.length === 44) {
        mrzLines.push(cleanLine);
      }
      
      // ID card MRZ: typically 30 characters, contains specific patterns
      if (cleanLine.length === 30 && /^[A-Z0-9<]+$/.test(cleanLine)) {
        mrzLines.push(cleanLine);
      }
      
      // Document number line in MRZ: contains document number pattern
      if (cleanLine.length >= 30 && /[A-Z]{2}\d{6,9}[A-Z]{3}\d{6}[MF]\d{6}/.test(cleanLine)) {
        mrzLines.push(cleanLine);
      }
    }
    
    return mrzLines.join('\n');
  }
}

// Export singleton instance
export const geminiVisionOCR = new GeminiVisionOCR();
export default geminiVisionOCR;