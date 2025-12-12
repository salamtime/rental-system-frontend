import { supabase } from '../../lib/supabase';

/**
 * GPT-4o Vision OCR Service
 * Handles ID document scanning using OpenAI's GPT-4o Vision API
 */

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Convert image file to base64
 */
const convertImageToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = () => {
      try {
        // Extract base64 data (remove data:image/...;base64, prefix)
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } catch (error) {
        reject(new Error('Failed to convert image to base64'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Call GPT-4o Vision API for OCR processing
 */
const callGPTVisionAPI = async (base64Image) => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `Extract structured data from this Moroccan ID document or driver's license. 

Return ONLY a valid JSON object with these exact keys (use empty string if field not found):

{
  "full_name": "",
  "date_of_birth": "",
  "place_of_birth": "",
  "id_number": "",
  "licence_number": "",
  "licence_issue_date": "",
  "licence_expiry_date": "",
  "nationality": "Moroccan",
  "id_scan_url": ""
}

Important rules:
- For dates, use YYYY-MM-DD format
- Extract full name as it appears on the document
- For Moroccan documents, nationality should be "Moroccan"
- If it's an ID card, licence fields will be empty
- If it's a driver's license, extract all available information
- Return ONLY the JSON object, no additional text or explanation`;

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const extractedText = result.choices[0]?.message?.content;

    if (!extractedText) {
      throw new Error('No content extracted from OpenAI response');
    }

    // Parse the JSON response
    let extractedData;
    try {
      // Clean the response to extract JSON
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in OpenAI response');
      }
      extractedData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse OpenAI JSON response:', parseError);
      console.error('Raw response:', extractedText);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Validate required fields
    if (!extractedData.full_name || extractedData.full_name.trim() === '') {
      throw new Error('Could not extract customer name from document');
    }

    return extractedData;

  } catch (error) {
    console.error('GPT Vision API error:', error);
    throw error;
  }
};

/**
 * Upload image to Supabase Storage
 */
const uploadImageToStorage = async (imageFile, customerId) => {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = imageFile.name.split('.').pop() || 'jpg';
    const filename = `idscan_${timestamp}.${fileExtension}`;
    const filePath = `${customerId}/${filename}`;

    console.log('Uploading image to:', filePath);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('id_scans')
      .upload(filePath, imageFile, {
        contentType: imageFile.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('id_scans')
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL for uploaded image');
    }

    console.log('Image uploaded successfully:', urlData.publicUrl);
    return urlData.publicUrl;

  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
};

/**
 * Save customer data to database
 */
const saveCustomerData = async (customerData, customerId) => {
  try {
    // Prepare data for database
    const dbData = {
      full_name: customerData.full_name,
      date_of_birth: customerData.date_of_birth || null,
      place_of_birth: customerData.place_of_birth || null,
      id_number: customerData.id_number || null,
      licence_number: customerData.licence_number || null,
      licence_issue_date: customerData.licence_issue_date || null,
      licence_expiry_date: customerData.licence_expiry_date || null,
      nationality: customerData.nationality || 'Moroccan',
      id_scan_image_url: customerData.id_scan_url || null,
      updated_at: new Date().toISOString()
    };

    // Try to update existing customer first
    const { data: existingCustomer } = await supabase
      .from('app_4c3a7a6153_customers')
      .select('id')
      .eq('id', customerId)
      .single();

    if (existingCustomer) {
      // Update existing customer
      const { data, error } = await supabase
        .from('app_4c3a7a6153_customers')
        .update(dbData)
        .eq('id', customerId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update customer: ${error.message}`);
      }

      console.log('Customer updated:', data.id);
      return data;
    } else {
      // Create new customer
      dbData.id = customerId;
      dbData.created_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('app_4c3a7a6153_customers')
        .insert([dbData])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create customer: ${error.message}`);
      }

      console.log('New customer created:', data.id);
      return data;
    }

  } catch (error) {
    console.error('Database save error:', error);
    throw error;
  }
};

/**
 * Main OCR processing function
 */
export const processIDDocument = async (imageFile, customerId = null) => {
  try {
    console.log('Starting GPT-4o Vision OCR processing...');

    // Generate customer ID if not provided
    if (!customerId) {
      customerId = `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Convert image to base64
    console.log('Converting image to base64...');
    const base64Image = await convertImageToBase64(imageFile);

    // Process with GPT-4o Vision
    console.log('Processing with GPT-4o Vision API...');
    const extractedData = await callGPTVisionAPI(base64Image);

    // Upload image to storage
    console.log('Uploading image to Supabase Storage...');
    const imageUrl = await uploadImageToStorage(imageFile, customerId);
    
    // Add image URL to extracted data
    extractedData.id_scan_url = imageUrl;

    // Save to database
    console.log('Saving customer data to database...');
    const savedCustomer = await saveCustomerData(extractedData, customerId);

    console.log('OCR processing completed successfully');

    return {
      success: true,
      customer: savedCustomer,
      extractedData,
      message: 'Successfully populated customer data from scanned ID.'
    };

  } catch (error) {
    console.error('OCR processing error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process ID document',
      customer: null
    };
  }
};

/**
 * Validate extracted OCR data
 */
export const validateOCRData = (data) => {
  const errors = [];
  
  if (!data.full_name || data.full_name.trim().length < 2) {
    errors.push('Full name is required and must be at least 2 characters');
  }
  
  if (!data.id_number || data.id_number.trim().length < 5) {
    errors.push('ID number is required and must be at least 5 characters');
  }
  
  // Date validation
  if (data.date_of_birth && !isValidDate(data.date_of_birth)) {
    errors.push('Invalid date of birth format. Expected YYYY-MM-DD');
  }
  
  if (data.licence_issue_date && !isValidDate(data.licence_issue_date)) {
    errors.push('Invalid licence issue date format. Expected YYYY-MM-DD');
  }
  
  if (data.licence_expiry_date && !isValidDate(data.licence_expiry_date)) {
    errors.push('Invalid licence expiry date format. Expected YYYY-MM-DD');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate date format helper
 */
const isValidDate = (dateString) => {
  if (!dateString) return true; // Empty dates are allowed
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date) && date.toISOString().slice(0, 10) === dateString;
};

export default {
  processIDDocument,
  validateOCRData
};