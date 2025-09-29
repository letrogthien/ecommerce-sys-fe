import React, { useState } from 'react';
import type { components } from '../../api-types/productService';

type VariantCreateRq = components['schemas']['VariantCreateRq'];

interface AddVariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  loading: boolean;
  onSubmit: (variantData: VariantCreateRq) => Promise<void>;
}

const AddVariantModal: React.FC<AddVariantModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
  loading,
  onSubmit
}) => {
  const [formData, setFormData] = useState<VariantCreateRq>({
    productId,
    sku: `VAR-${Date.now().toString().slice(-6)}`, // Generate default SKU
    price: 0,
    availableQty: 0,
    attributes: {}
  });

  const [attributes, setAttributes] = useState<Array<{ key: string; value: string }>>([
    { key: 'Màu sắc', value: '' } // Default attribute with key
  ]);

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update formData when productId changes
  React.useEffect(() => {
    setFormData(prev => ({
      ...prev,
      productId
    }));
  }, [productId]);

  // Debug: Log formData changes
  React.useEffect(() => {
    console.log('FormData changed:', formData);
  }, [formData]);

  // Debug: Log attributes changes
  React.useEffect(() => {
    console.log('Attributes changed:', attributes);
  }, [attributes]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    // Validate SKU - make it required and unique looking
    if (!formData.sku?.trim()) {
      newErrors.sku = 'SKU không được để trống';
    } else if (formData.sku.trim().length < 3) {
      newErrors.sku = 'SKU phải có ít nhất 3 ký tự';
    }

    // Validate price
    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Giá phải lớn hơn 0';
    }

    // Validate quantity
    if (formData.availableQty === undefined || formData.availableQty < 0) {
      newErrors.availableQty = 'Số lượng không được âm';
    }

    // Validate attributes - must have at least one
    const validAttributes = attributes.filter(attr => attr.key.trim() && attr.value.trim());
    if (validAttributes.length === 0) {
      newErrors.attributes = 'Phải có ít nhất một thuộc tính để phân biệt biến thể';
    }

    // Check for duplicate attribute keys
    const attributeKeys = validAttributes.map(attr => attr.key.trim().toLowerCase());
    const duplicateKeys = attributeKeys.filter((key, index) => attributeKeys.indexOf(key) !== index);
    if (duplicateKeys.length > 0) {
      newErrors.attributes = `Tên thuộc tính không được trùng lặp: ${duplicateKeys.join(', ')}`;
    }

    // Validate productId
    if (!formData.productId || !productId) {
      newErrors.productId = 'Product ID không hợp lệ';
    }

    console.log('=== VALIDATION RESULTS ===');
    console.log('Form data:', formData);
    console.log('Attributes:', attributes);
    console.log('Valid attributes:', validAttributes);
    console.log('Errors:', newErrors);

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== HANDLE SUBMIT CALLED ===');
    console.log('isSubmitting:', isSubmitting);
    console.log('Current formData:', formData);
    console.log('Current attributes:', attributes);
    
    if (isSubmitting) {
      console.log('Already submitting, aborting...');
      return;
    }
    
    const isValid = validateForm();
    console.log('Form validation result:', isValid);
    
    if (!isValid) {
      console.log('Form validation failed, aborting...');
      return;
    }

    setIsSubmitting(true);

    // Convert attributes array to object
    console.log('=== PROCESSING ATTRIBUTES ===');
    console.log('Raw attributes array:', attributes);
    console.log('Attributes length:', attributes.length);
    
    // Log each attribute individually
    attributes.forEach((attr, index) => {
      console.log(`Attribute ${index}:`, {
        key: `"${attr.key}"`,
        value: `"${attr.value}"`,
        keyTrim: `"${attr.key.trim()}"`,
        valueTrim: `"${attr.value.trim()}"`,
        keyLength: attr.key.length,
        valueLength: attr.value.length
      });
    });
    
    const filteredAttributes = attributes.filter(attr => {
      const hasKey = attr.key && attr.key.trim().length > 0;
      const hasValue = attr.value && attr.value.trim().length > 0;
      console.log(`Filtering attribute "${attr.key}" = "${attr.value}": hasKey=${hasKey}, hasValue=${hasValue}`);
      return hasKey && hasValue;
    });
    
    console.log('Filtered attributes:', filteredAttributes);
    console.log('Filtered attributes length:', filteredAttributes.length);
    
    const attributesObj: {[key: string]: string} = {};
    
    if (filteredAttributes.length === 0) {
      console.warn('No valid attributes found! Adding default attribute...');
      // Add a default attribute if none provided
      attributesObj['Variant'] = 'Default';
    } else {
      filteredAttributes.forEach((attr, index) => {
          const key = attr.key.trim();
          const value = attr.value.trim();
          attributesObj[key] = value;
          console.log(`Adding attribute ${index}: "${key}" = "${value}"`);
      });
    }

    console.log('Final attributesObj:', attributesObj);
    console.log('AttributesObj keys:', Object.keys(attributesObj));
    console.log('AttributesObj values:', Object.values(attributesObj));
    console.log('Current formData before merge:', formData);

    const variantData: VariantCreateRq = {
      productId: formData.productId || productId, // Ensure productId is set
      sku: formData.sku?.trim() || `VAR-${Date.now().toString().slice(-6)}`, // Ensure SKU is not empty
      price: formData.price || 0,
      availableQty: formData.availableQty || 0,
      attributes: attributesObj,
      attributesHash: formData.attributesHash || ''
    };

    console.log('EXPLICIT variantData construction:', variantData);

    // Final validation before submission
    if (!variantData.sku || variantData.sku.trim() === '') {
      console.error('SKU is empty, aborting submission');
      alert('Lỗi: SKU không được để trống');
      setIsSubmitting(false);
      return;
    }

    if (!variantData.attributes || Object.keys(variantData.attributes).length === 0) {
      console.error('Attributes is empty, aborting submission');
      alert('Lỗi: Phải có ít nhất một thuộc tính');
      setIsSubmitting(false);
      return;
    }

    console.log('=== SUBMITTING VARIANT ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('ProductId from props:', productId);
    console.log('FormData productId:', formData.productId);
    console.log('Raw formData:', formData);
    console.log('Raw attributes:', attributes);
    console.log('Processed attributesObj:', attributesObj);
    console.log('Final variantData:', variantData);
    console.log('isSubmitting before:', isSubmitting);

    try {
      await onSubmit(variantData);
      console.log('=== VARIANT SUBMITTED SUCCESSFULLY ===');
      handleClose();
    } catch (error) {
      console.error('=== ERROR CREATING VARIANT ===', error);
    } finally {
      setIsSubmitting(false);
      console.log('=== SUBMISSION FINISHED ===');
    }
  };

  const handleClose = () => {
    // Reset form với default values
    const defaultSku = `VAR-${Date.now().toString().slice(-6)}`;
    setFormData({
      productId,
      sku: defaultSku,
      price: 0,
      availableQty: 0,
      attributes: {}
    });
    setAttributes([{ key: 'Màu sắc', value: '' }]); // Default attribute
    setErrors({});
    setIsSubmitting(false);
    onClose();
  };

  const addAttribute = () => {
    setAttributes([...attributes, { key: '', value: '' }]);
  };

  const removeAttribute = (index: number) => {
    if (attributes.length > 1) {
      setAttributes(attributes.filter((_, i) => i !== index));
    }
  };

  const updateAttribute = (index: number, field: 'key' | 'value', value: string) => {
    console.log(`Updating attribute ${index}.${field} = "${value}"`);
    const newAttributes = [...attributes];
    newAttributes[index][field] = value;
    console.log('New attributes after update:', newAttributes);
    setAttributes(newAttributes);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Thêm biến thể - {productName}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* SKU */}
            <div>
              <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
                SKU *
              </label>
              <input
                type="text"
                id="sku"
                value={formData.sku || ''}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.sku ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="VD: VAR-RED-L, SHIRT-BLUE-XL"
              />
              {errors.sku && <p className="text-red-500 text-sm mt-1">{errors.sku}</p>}
              {errors.productId && <p className="text-red-500 text-sm mt-1">{errors.productId}</p>}
            </div>

            {/* Price */}
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                Giá *
              </label>
              <input
                type="number"
                id="price"
                min="0"
                step="0.01"
                value={formData.price || ''}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.price ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
            </div>

            {/* Quantity */}
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                Số lượng *
              </label>
              <input
                type="number"
                id="quantity"
                min="0"
                value={formData.availableQty || ''}
                onChange={(e) => setFormData({ ...formData, availableQty: parseInt(e.target.value) || 0 })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.availableQty ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0"
              />
              {errors.availableQty && <p className="text-red-500 text-sm mt-1">{errors.availableQty}</p>}
            </div>

            {/* Attributes */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="block text-sm font-medium text-gray-700">
                  Thuộc tính *
                </span>
                <button
                  type="button"
                  onClick={addAttribute}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  + Thêm thuộc tính
                </button>
              </div>
              
              <div className="space-y-3">
                {attributes.map((attr, index) => (
                  <div key={`attr-${index}-${attr.key}`} className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Tên thuộc tính (VD: Màu sắc, Kích thước)"
                      value={attr.key}
                      onChange={(e) => updateAttribute(index, 'key', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Giá trị (VD: Đỏ, XL)"
                      value={attr.value}
                      onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {attributes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAttribute(index)}
                        className="px-3 py-2 text-red-600 hover:text-red-800"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {errors.attributes && <p className="text-red-500 text-sm mt-1">{errors.attributes}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {(loading || isSubmitting) ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Đang tạo...
                </>
              ) : (
                'Tạo biến thể'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddVariantModal;