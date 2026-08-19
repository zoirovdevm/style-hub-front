import { gql } from '@apollo/client';

export const REGISTER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      email
      phone
    }
  }
`;

export const VERIFY_EMAIL = gql`
  mutation VerifyEmail($input: VerifyEmailInput!) {
    verifyEmail(input: $input) {
      accessToken
      refreshToken
      user {
        id
        email
        firstName
        lastName
        role
      }
    }
  }
`;

export const RESEND_VERIFICATION_CODE = gql`
  mutation ResendVerificationCode($email: String!) {
    resendVerificationCode(email: $email)
  }
`;

export const REQUEST_PASSWORD_RESET = gql`
  mutation RequestPasswordReset($input: RequestPasswordResetInput!) {
    requestPasswordReset(input: $input) {
      email
      phone
    }
  }
`;

export const RESET_PASSWORD = gql`
  mutation ResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input) {
      accessToken
      refreshToken
      user {
        id
        email
        firstName
        lastName
        role
      }
    }
  }
`;

export const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
      user {
        id
        email
        firstName
        lastName
        role
      }
    }
  }
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      firstName
      lastName
      phone
      avatar
      address
    }
  }
`;

export const ADD_TO_CART = gql`
  mutation AddToCart($input: AddToCartInput!) {
    addToCart(input: $input) {
      id
      quantity
    }
  }
`;

export const UPDATE_CART_ITEM = gql`
  mutation UpdateCartItem($input: UpdateCartItemInput!) {
    updateCartItem(input: $input) {
      id
      quantity
    }
  }
`;

export const REMOVE_CART_ITEM = gql`
  mutation RemoveCartItem($id: ID!) {
    removeCartItem(id: $id)
  }
`;

export const CLEAR_CART = gql`
  mutation ClearCart {
    clearCart
  }
`;

export const TOGGLE_WISHLIST = gql`
  mutation ToggleWishlist($productId: ID!) {
    toggleWishlist(productId: $productId) {
      added
    }
  }
`;

export const REMOVE_WISHLIST_ITEM = gql`
  mutation RemoveWishlistItem($id: ID!) {
    removeWishlistItem(id: $id)
  }
`;

export const CREATE_ORDER = gql`
  mutation CreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      id
      orderNumber
      totalAmount
      paymentMethod
    }
  }
`;

export const INITIATE_PAYMENT = gql`
  mutation InitiatePayment($orderId: ID!, $method: PaymentMethod!) {
    initiatePayment(orderId: $orderId, method: $method) {
      payUrl
    }
  }
`;

export const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
      slug
    }
  }
`;

export const UPDATE_PRODUCT = gql`
  mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
    updateProduct(id: $id, input: $input) {
      id
      slug
    }
  }
`;

export const REMOVE_PRODUCT = gql`
  mutation RemoveProduct($id: ID!) {
    removeProduct(id: $id)
  }
`;

// Bazadan butunlay o'chirish — faqat allaqachon yashirilgan tovar uchun
// (admin/products sahifasida shunday cheklangan).
export const HARD_DELETE_PRODUCT = gql`
  mutation HardDeleteProduct($id: ID!) {
    hardDeleteProduct(id: $id)
  }
`;

export const CREATE_CATEGORY = gql`
  mutation CreateCategory($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      id
      slug
    }
  }
`;

export const UPDATE_CATEGORY = gql`
  mutation UpdateCategory($id: ID!, $input: UpdateCategoryInput!) {
    updateCategory(id: $id, input: $input) {
      id
      name
      nameRu
      slug
    }
  }
`;

export const CREATE_BRAND = gql`
  mutation CreateBrand($input: CreateBrandInput!) {
    createBrand(input: $input) {
      id
      slug
    }
  }
`;

export const CREATE_STORE = gql`
  mutation CreateStore($input: CreateStoreInput!) {
    createStore(input: $input) {
      id
      slug
    }
  }
`;

// Hozircha faqat komissiya foizini (commissionPercent) o'zgartirish uchun
// ishlatiladi — magazin ichki sahifasidagi "Mening ulushim" kartochkasi.
export const UPDATE_STORE = gql`
  mutation UpdateStore($id: ID!, $input: UpdateStoreInput!) {
    updateStore(id: $id, input: $input) {
      id
      commissionPercent
    }
  }
`;

export const REMOVE_STORE = gql`
  mutation RemoveStore($id: ID!) {
    removeStore(id: $id)
  }
`;

export const REGENERATE_STORE_CODE = gql`
  mutation RegenerateStoreCode($id: ID!) {
    regenerateStoreCode(id: $id)
  }
`;

export const REVOKE_STORE_SELLERS = gql`
  mutation RevokeStoreSellers($id: ID!) {
    revokeStoreSellers(id: $id)
  }
`;

export const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($input: UpdateOrderStatusInput!) {
    updateOrderStatus(input: $input) {
      id
      status
    }
  }
`;

export const SET_USER_ACTIVE = gql`
  mutation SetUserActive($id: ID!, $isActive: Boolean!) {
    setUserActive(id: $id, isActive: $isActive) {
      id
      isActive
    }
  }
`;

export const CLEAR_ALL_DATA = gql`
  mutation ClearAllData {
    clearAllData
  }
`;

// Mahsulotlarga tegmaydi — faqat buyurtma/to'lov/savat/sevimlilar ro'yxati
// o'chadi.
export const CLEAR_ORDERS_DATA = gql`
  mutation ClearOrdersData {
    clearOrdersData
  }
`;

export const UPDATE_SITE_SETTINGS = gql`
  mutation UpdateSiteSettings($input: UpdateSiteSettingsInput!) {
    updateSiteSettings(input: $input) {
      id
      heroImage
      contactAddress
      contactPhone
      contactTelegram
      contactEmail
      updatedAt
    }
  }
`;

export const CREATE_REVIEW = gql`
  mutation CreateReview($input: CreateReviewInput!) {
    createReview(input: $input) {
      id
      rating
      comment
      image
      createdAt
      user {
        id
        firstName
        lastName
        avatar
      }
    }
  }
`;

// Backend already restricts this to admins only (@Roles(Role.ADMIN) in
// review.resolver.ts) — a non-admin's call is rejected server-side even if
// someone tampered with the frontend, so the `user?.role === 'ADMIN'` check
// that hides/shows the delete button in ProductReviews.tsx is just UX, not
// the actual security boundary.
export const DELETE_REVIEW = gql`
  mutation DeleteReview($id: ID!) {
    deleteReview(id: $id)
  }
`;

export const SEND_CONTACT_MESSAGE = gql`
  mutation SendContactMessage($input: ContactMessageInput!) {
    sendContactMessage(input: $input)
  }
`;

export const SET_ORDER_PAYMENT_STATUS = gql`
  mutation SetOrderPaymentStatus($orderId: ID!, $paid: Boolean!) {
    setOrderPaymentStatus(orderId: $orderId, paid: $paid) {
      id
      paymentStatus
    }
  }
`;
