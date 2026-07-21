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

export const CREATE_CATEGORY = gql`
  mutation CreateCategory($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      id
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

export const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($input: UpdateOrderStatusInput!) {
    updateOrderStatus(input: $input) {
      id
      status
    }
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
