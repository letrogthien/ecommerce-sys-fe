import type { components } from "../api-types/productService";
import apiClientProduct from "./apiClientProduct";

type ApiResponsePageProductDto = components["schemas"]["ApiResponsePageProductDto"];
type ApiResponseProductDto = components["schemas"]["ApiResponseProductDto"];
type ApiResponseListProductVariantDto = components["schemas"]["ApiResponseListProductVariantDto"];
type ApiResponseProductVariantDto = components["schemas"]["ApiResponseProductVariantDto"];
type ApiResponseListCategoryDto = components["schemas"]["ApiResponseListCategoryDto"];
type ApiResponseCategoryDto = components["schemas"]["ApiResponseCategoryDto"];
type ApiResponseVoid = components["schemas"]["ApiResponseVoid"];
type ProductDto = components["schemas"]["ProductDto"];
type ProductImageDto = components["schemas"]["ProductImageDto"];
type ProductVariantDto = components["schemas"]["ProductVariantDto"];
type ProductCreateRq = components["schemas"]["ProductCreateRq"];
type ProductUpdateRq = components["schemas"]["ProductUpdateRq"];
type VariantCreateRq = components["schemas"]["VariantCreateRq"];
type VariantUpdateRq = components["schemas"]["VariantUpdateRq"];
type CategoryDto = components["schemas"]["CategoryDto"];

// Type for hot deal response
export type HotDealVariant = {
  id: string;
  productId: string;
  sku: string;
  attributes: Record<string, string>;
  attributesHash: string;
  price: number;
  availableQty: number;
  reservedQty: number;
  soldQty: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type HotDealResponse = {
  data: HotDealVariant[];
  message: string | null;
  timestamp: string;
  status: string;
};

/**
 * Fetch hot deal product variants
 */
export const fetchHotDealProducts = async (limit: number = 6): Promise<HotDealVariant[]> => {
  try {
    const response = await apiClientProduct.get<HotDealResponse>(
      `/api/v1/product-service/product-variants/hot-deal`,
      {
        params: { limit },
      }
    );

    return response.data?.data || [];
  } catch (error) {
    console.error("Error fetching hot deal products:", error);
    throw error;
  }
};

/**
 * Get product by ID
 */
export const getProductById = async (id: string): Promise<ProductDto | null> => {
  try {
    const response = await apiClientProduct.get<ApiResponseProductDto>(`/api/v1/product-service/products/${id}`);
    return response.data.data || null;
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    return null;
  }
};

/**
 * Get product by slug
 */
export const getProductBySlug = async (slug: string): Promise<ProductDto | null> => {
  try {
    const response = await apiClientProduct.get<ApiResponseProductDto>(`/api/v1/product-service/products/slug/${slug}`);
    return response.data.data || null;
  } catch (error) {
    console.error('Error fetching product by slug:', error);
    return null;
  }
};

/**
 * Get product variants by product ID
 */
export const getVariantsByProduct = async (productId: string): Promise<ProductVariantDto[]> => {
  try {
    const response = await apiClientProduct.get<ApiResponseListProductVariantDto>(`/api/v1/product-service/product-variants/product/${productId}`);
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching variants by product:', error);
    return [];
  }
};

/**
 * Search products with pagination
 */
export const searchProducts = async (
  keyword: string,
  page: number = 0,
  size: number = 10
): Promise<{ products: ProductDto[]; totalElements: number; totalPages: number; currentPage: number }> => {
  try {
    const response = await apiClientProduct.get<ApiResponsePageProductDto>('/api/v1/product-service/products/search', {
      params: { keyword, page, size }
    });
    
    const pageData = response.data.data;
    return {
      products: pageData?.content || [],
      totalElements: pageData?.totalElements || 0,
      totalPages: pageData?.totalPages || 0,
      currentPage: pageData?.number || 0,
    };
  } catch (error) {
    console.error('Error searching products:', error);
    return {
      products: [],
      totalElements: 0,
      totalPages: 0,
      currentPage: 0,
    };
  }
};

/**
 * Get products by seller with pagination
 */
export const getProductsBySeller = async (
  page: number = 0,
  size: number = 10,
  sortBy: string = 'createdAt',
  sortDirection: string = 'desc'
): Promise<{ products: ProductDto[]; totalElements: number; totalPages: number; currentPage: number }> => {
  try {
    const response = await apiClientProduct.get<ApiResponsePageProductDto>('/api/v1/product-service/products/seller', {
      params: { page, size, sortBy, sortDirection }
    });
    
    const pageData = response.data.data;
    return {
      products: pageData?.content || [],
      totalElements: pageData?.totalElements || 0,
      totalPages: pageData?.totalPages || 0,
      currentPage: pageData?.number || 0,
    };
  } catch (error) {
    console.error('Error fetching seller products:', error);
    return {
      products: [],
      totalElements: 0,
      totalPages: 0,
      currentPage: 0,
    };
  }
};

/**
 * Get all products with pagination
 */
export const getAllProducts = async (
  page: number = 0,
  size: number = 10,
  sortBy: string = 'createdAt',
  sortDirection: string = 'desc'
): Promise<{ products: ProductDto[]; totalElements: number; totalPages: number; currentPage: number }> => {
  try {
    const response = await apiClientProduct.get<ApiResponsePageProductDto>('/api/v1/product-service/products', {
      params: { page, size, sortBy, sortDirection }
    });
    
    const pageData = response.data.data;
    return {
      products: pageData?.content || [],
      totalElements: pageData?.totalElements || 0,
      totalPages: pageData?.totalPages || 0,
      currentPage: pageData?.number || 0,
    };
  } catch (error) {
    console.error('Error fetching all products:', error);
    return {
      products: [],
      totalElements: 0,
      totalPages: 0,
      currentPage: 0,
    };
  }
};

/**
 * Fetch products by category ID with pagination
 */
export const fetchProductsByCategory = async (
  categoryId: string,
  page: number = 0,
  size: number = 20
): Promise<{ products: ProductDto[]; totalElements: number; totalPages: number; currentPage: number }> => {
  try {
    const response = await apiClientProduct.get<ApiResponsePageProductDto>(
      `/api/v1/product-service/products/category/${categoryId}`,
      {
        params: {
          page,
          size,
        },
      }
    );

    const pageData = response.data.data;
    return {
      products: pageData?.content || [],
      totalElements: pageData?.totalElements || 0,
      totalPages: pageData?.totalPages || 0,
      currentPage: pageData?.number || 0,
    };
  } catch (error) {
    console.error("Error fetching products by category:", error);
    return {
      products: [],
      totalElements: 0,
      totalPages: 0,
      currentPage: 0,
    };
  }
};

/**
 * Create a new product
 */
export const createProduct = async (productData: ProductCreateRq): Promise<ProductDto | null> => {
  try {
    const response = await apiClientProduct.post<ApiResponseProductDto>(
      '/api/v1/product-service/products',
      productData
    );
    return response.data.data || null;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

/**
 * Create a new product variant
 */
export const createProductVariant = async (variantData: VariantCreateRq): Promise<ProductVariantDto | null> => {
  try {
    console.log('=== API CALL: createProductVariant ===');
    console.log('URL:', '/api/v1/product-service/product-variants');
    console.log('Payload being sent:', JSON.stringify(variantData, null, 2));
    console.log('Payload type:', typeof variantData);
    console.log('Payload keys:', Object.keys(variantData));
    
    const response = await apiClientProduct.post<ApiResponseProductVariantDto>(
      '/api/v1/product-service/product-variants',
      variantData
    );
    
    console.log('API Response:', response.data);
    console.log('=== API CALL COMPLETED ===');
    
    return response.data.data || null;
  } catch (error) {
    console.error('=== API CALL ERROR ===');
    console.error('Error creating product variant:', error);
    console.error('Request data was:', variantData);
    throw error;
  }
};

/**
 * Get root categories (top-level categories without parent)
 */
export const getRootCategories = async (): Promise<CategoryDto[]> => {
  try {
    // Assuming we can get root categories by calling with a special root ID
    // You may need to adjust this endpoint based on your API
    const response = await apiClientProduct.get<ApiResponseListCategoryDto>(
      '/api/v1/product-service/categories/root'
    );
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching root categories:', error);
    return [];
  }
};

/**
 * Get categories by parent ID
 */
export const getCategoriesByParent = async (parentId: string): Promise<CategoryDto[]> => {
  try {
    const response = await apiClientProduct.get<ApiResponseListCategoryDto>(
      `/api/v1/product-service/categories/${parentId}/children`
    );
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

/**
 * Delete product by ID
 */
export const deleteProduct = async (productId: string): Promise<boolean> => {
  try {
    await apiClientProduct.delete(`/api/v1/product-service/products/${productId}`);
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

/**
 * Update product by ID
 */
export const updateProduct = async (productId: string, productData: ProductCreateRq): Promise<ProductDto | null> => {
  try {
    const response = await apiClientProduct.put<ApiResponseProductDto>(
      `/api/v1/product-service/products/${productId}`,
      productData
    );
    return response.data.data || null;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

/**
 * Get product variants by product ID
 */
export const getProductVariants = async (productId: string): Promise<ProductVariantDto[]> => {
  try {
    const response = await apiClientProduct.get<ApiResponseListProductVariantDto>(
      `/api/v1/product-service/products/${productId}/variants`
    );
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching product variants:', error);
    return [];
  }
};

/**
 * Update product variant
 */
export const updateProductVariant = async (variantId: string, variantData: VariantCreateRq): Promise<ProductVariantDto | null> => {
  try {
    const response = await apiClientProduct.put<ApiResponseProductVariantDto>(
      `/api/v1/product-service/product-variants/${variantId}`,
      variantData
    );
    return response.data.data || null;
  } catch (error) {
    console.error('Error updating product variant:', error);
    throw error;
  }
};

/**
 * Delete product variant
 */
export const deleteProductVariant = async (variantId: string): Promise<boolean> => {
  try {
    await apiClientProduct.delete(`/api/v1/product-service/product-variants/${variantId}`);
    return true;
  } catch (error) {
    console.error('Error deleting product variant:', error);
    throw error;
  }
};

/**
 * Upload images for a product (uploads one by one as API only accepts single file)
 */
export const uploadProductImages = async (
  productId: string, 
  images: File[],
  options?: {
    alt?: string;
    main?: boolean;
    position?: number;
  }[]
): Promise<ProductDto | null> => {
  try {
    let updatedProduct: ProductDto | null = null;
    
    // Upload images one by one since API only accepts single file
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const option = options?.[i] || {};
      
      const formData = new FormData();
      formData.append('file', image);

      const params = new URLSearchParams();
      if (option.alt) params.append('alt', option.alt);
      if (option.main !== undefined) params.append('main', option.main.toString());
      if (option.position !== undefined) params.append('position', option.position.toString());

      const response = await apiClientProduct.post<ApiResponseProductDto>(
        `/api/v1/product-service/products/${productId}/images?${params.toString()}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      updatedProduct = response.data.data || null;
    }

    return updatedProduct;
  } catch (error) {
    console.error('Error uploading product images:', error);
    throw error;
  }
};

/**
 * Get product images (images are included in ProductDto, so this just gets the product)
 */
export const getProductImages = async (productId: string): Promise<ProductImageDto[]> => {
  try {
    const product = await getProductById(productId);
    return product?.images || [];
  } catch (error) {
    console.error('Error fetching product images:', error);
    return [];
  }
};

/**
 * Delete product image (Note: API specification doesn't show delete endpoint for individual images)
 * This function may need to be implemented when the endpoint is available
 */
export const deleteProductImage = async (productId: string, imageId: string): Promise<boolean> => {
  try {
    // Note: This endpoint may not exist in current API spec
    // You may need to implement this on backend first
    await apiClientProduct.delete(`/api/v1/product-service/products/${productId}/images/${imageId}`);
    return true;
  } catch (error) {
    console.error('Error deleting product image:', error);
    throw error;
  }
};

// ===============================
// ADMIN ENDPOINTS
// ===============================

/**
 * [ADMIN] Create a new category
 */
export const adminCreateCategory = async (categoryData: CategoryDto): Promise<CategoryDto | null> => {
  try {
    const response = await apiClientProduct.post<ApiResponseCategoryDto>(
      '/api/v1/product-service/admin/categories',
      categoryData
    );
    return response.data.data || null;
  } catch (error) {
    console.error('Error creating category (admin):', error);
    throw error;
  }
};

/**
 * [ADMIN] Update a category by ID
 */
export const adminUpdateCategory = async (id: string, categoryData: CategoryDto): Promise<CategoryDto | null> => {
  try {
    const response = await apiClientProduct.put<ApiResponseCategoryDto>(
      `/api/v1/product-service/admin/categories/${id}`,
      categoryData
    );
    return response.data.data || null;
  } catch (error) {
    console.error('Error updating category (admin):', error);
    throw error;
  }
};

/**
 * [ADMIN] Delete a category by ID
 */
export const adminDeleteCategory = async (id: string): Promise<boolean> => {
  try {
    await apiClientProduct.delete<ApiResponseVoid>(
      `/api/v1/product-service/admin/categories/${id}`
    );
    return true;
  } catch (error) {
    console.error('Error deleting category (admin):', error);
    throw error;
  }
};

// ===============================
// INVENTORY MANAGEMENT ENDPOINTS
// ===============================

/**
 * Reserve inventory for a product variant
 */
export const reserveVariantInventory = async (variantId: string, qty: number): Promise<ProductVariantDto | null> => {
  try {
    const response = await apiClientProduct.post<ApiResponseProductVariantDto>(
      `/api/v1/product-service/product-variants/${variantId}/reserve`,
      null,
      {
        params: { qty }
      }
    );
    return response.data.data || null;
  } catch (error) {
    console.error('Error reserving variant inventory:', error);
    throw error;
  }
};

/**
 * Release reserved inventory for a product variant
 */
export const releaseVariantInventory = async (variantId: string, qty: number): Promise<ProductVariantDto | null> => {
  try {
    const response = await apiClientProduct.post<ApiResponseProductVariantDto>(
      `/api/v1/product-service/product-variants/${variantId}/release`,
      null,
      {
        params: { qty }
      }
    );
    return response.data.data || null;
  } catch (error) {
    console.error('Error releasing variant inventory:', error);
    throw error;
  }
};

/**
 * Commit reserved inventory for a product variant (finalize the reservation)
 */
export const commitVariantInventory = async (variantId: string, qty: number): Promise<ProductVariantDto | null> => {
  try {
    const response = await apiClientProduct.post<ApiResponseProductVariantDto>(
      `/api/v1/product-service/product-variants/${variantId}/commit`,
      null,
      {
        params: { qty }
      }
    );
    return response.data.data || null;
  } catch (error) {
    console.error('Error committing variant inventory:', error);
    throw error;
  }
};

// ===============================
// ADDITIONAL PRODUCT ENDPOINTS
// ===============================

/**
 * Update product using ProductUpdateRq instead of ProductCreateRq
 */
export const updateProductAdvanced = async (productId: string, productData: ProductUpdateRq): Promise<ProductDto | null> => {
  try {
    const response = await apiClientProduct.put<ApiResponseProductDto>(
      `/api/v1/product-service/products/${productId}`,
      productData
    );
    return response.data.data || null;
  } catch (error) {
    console.error('Error updating product (advanced):', error);
    throw error;
  }
};

/**
 * Update product variant using VariantUpdateRq
 */
export const updateProductVariantAdvanced = async (variantId: string, variantData: VariantUpdateRq): Promise<ProductVariantDto | null> => {
  try {
    const response = await apiClientProduct.put<ApiResponseProductVariantDto>(
      `/api/v1/product-service/product-variants/${variantId}`,
      variantData
    );
    return response.data.data || null;
  } catch (error) {
    console.error('Error updating product variant (advanced):', error);
    throw error;
  }
};

/**
 * Get product variant by ID
 */
export const getProductVariantById = async (id: string): Promise<ProductVariantDto | null> => {
  try {
    const response = await apiClientProduct.get<ApiResponseProductVariantDto>(
      `/api/v1/product-service/product-variants/${id}`
    );
    return response.data.data || null;
  } catch (error) {
    console.error('Error fetching product variant by ID:', error);
    return null;
  }
};