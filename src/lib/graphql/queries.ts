import { gql } from '@apollo/client';

export const PRODUCT_FIELDS = gql`
  fragment ProductFields on Product {
    id
    title
    titleRu
    slug
    description
    descriptionRu
    sku
    price
    oldPrice
    discountPercent
    stock
    sizes
    colors
    images
    variants {
      id
      size
      color
      stock
    }
    isFeatured
    rating
    reviewsCount
    viewCount
    soldCount
    createdAt
    category {
      id
      name
      nameRu
      slug
    }
    brand {
      id
      name
      slug
    }
  }
`;

export const GET_PRODUCTS = gql`
  ${PRODUCT_FIELDS}
  query GetProducts($filter: ProductFilterInput!) {
    products(filter: $filter) {
      total
      list {
        ...ProductFields
      }
    }
  }
`;

export const GET_PRODUCT = gql`
  ${PRODUCT_FIELDS}
  query GetProduct($slug: String!) {
    product(slug: $slug) {
      ...ProductFields
    }
  }
`;

export const GET_BEST_SELLERS = gql`
  ${PRODUCT_FIELDS}
  query GetBestSellers($limit: Float) {
    bestSellers(limit: $limit) {
      ...ProductFields
    }
  }
`;

export const GET_CATEGORIES = gql`
  query GetCategories {
    categories {
      id
      name
      nameRu
      slug
      description
      image
    }
  }
`;

export const GET_BRANDS = gql`
  query GetBrands {
    brands {
      id
      name
      slug
      logo
    }
  }
`;

// Magazinlar ro'yxati — backend'da faqat ADMIN roliga ochiq, shuning uchun
// bu so'rov faqat admin panel sahifalarida ishlatiladi.
export const GET_STORES = gql`
  query GetStores {
    stores {
      id
      name
      slug
    }
  }
`;

// Magazinlar ro'yxati sahifasidagi kartochkalar uchun — har bir magazin
// o'z raqamlari bilan (faqat admin).
export const GET_STORES_STATS = gql`
  query GetStoresStats {
    storesStats {
      id
      name
      slug
      totalProducts
      totalStock
      totalSold
      revenue
      commissionPercent
      myShare
      lowStockCount
    }
  }
`;

// Bitta magazinning ichki sahifasi: statistika + tovarlari (faqat admin).
export const GET_STORE_OVERVIEW = gql`
  query GetStoreOverview($id: ID!) {
    storeOverview(id: $id) {
      stats {
        id
        name
        slug
        accessCode
        sellers
        totalProducts
        totalStock
        totalSold
        revenue
        commissionPercent
        myShare
        lowStockCount
      }
      products {
        id
        title
        slug
        price
        stock
        soldCount
        images
        createdAt
        category {
          id
          name
        }
      }
    }
  }
`;

// Admin tovarlar jadvali uchun — public "products" so'rovidan ataylab
// ajratilgan "productsAdmin" ishlatiladi (backendda @Roles(ADMIN) bilan
// qo'riqlangan): u store (magazin) maydonini HAM, yashirilgan
// (isActive=false) tovarlarni HAM qaytaradi — masalan magazin o'chirilganda
// avtomatik yashiringan tovarlarni admin shu yerda ko'rib, xohlasa butunlay
// o'chirishi (hardDeleteProduct) mumkin. Public sahifalar buni ishlatmaydi,
// shuning uchun na magazin nomi, na yashirilgan tovarlar xaridorlarga hech
// qayerda ko'rinmaydi.
export const GET_PRODUCTS_ADMIN = gql`
  query GetProductsAdmin($filter: ProductFilterInput!) {
    productsAdmin(filter: $filter) {
      total
      list {
        id
        title
        price
        stock
        isActive
        category {
          id
          name
        }
        store {
          id
          name
        }
      }
    }
  }
`;

export const GET_ME = gql`
  query Me {
    me {
      id
      email
      firstName
      lastName
      phone
      avatar
      address
      role
      createdAt
    }
  }
`;

export const GET_MY_CART = gql`
  ${PRODUCT_FIELDS}
  query MyCart {
    myCart {
      id
      productId
      size
      color
      quantity
      product {
        ...ProductFields
      }
    }
  }
`;

export const GET_MY_WISHLIST = gql`
  ${PRODUCT_FIELDS}
  query MyWishlist {
    myWishlist {
      id
      productId
      product {
        ...ProductFields
      }
    }
  }
`;

export const GET_MY_ORDERS = gql`
  query MyOrders {
    myOrders {
      id
      orderNumber
      status
      totalAmount
      deliveryAddress
      deliveryCity
      phone
      paymentMethod
      paymentStatus
      createdAt
      items {
        id
        title
        price
        size
        color
        quantity
        product {
          id
          slug
          images
        }
      }
    }
  }
`;

export const GET_ALL_ORDERS = gql`
  query AllOrders($filter: OrderFilterInput!) {
    allOrders(filter: $filter) {
      total
      list {
        id
        orderNumber
        status
        totalAmount
        phone
        deliveryAddress
        paymentMethod
        paymentStatus
        createdAt
        user {
          id
          firstName
          lastName
          email
        }
        items {
          id
          title
          price
          size
          color
          quantity
        }
      }
    }
  }
`;

export const GET_USERS = gql`
  query Users($filter: UsersFilterInput!) {
    users(filter: $filter) {
      total
      list {
        id
        email
        phone
        firstName
        lastName
        address
        role
        isActive
        lastSeenAt
        createdAt
        ordersCount
      }
    }
  }
`;

export const GET_REVIEWS = gql`
  query GetReviews($productId: ID!) {
    reviews(productId: $productId) {
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

// Only called for logged-in users (skip: !user) — decides whether to show
// the "write a review" form or a "purchase this first" message.
export const CAN_REVIEW_PRODUCT = gql`
  query CanReviewProduct($productId: ID!) {
    canReviewProduct(productId: $productId)
  }
`;

export const GET_SITE_SETTINGS = gql`
  query SiteSettings {
    siteSettings {
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

export const GET_ADMIN_STATS = gql`
  ${PRODUCT_FIELDS}
  query AdminStats {
    adminStats {
      totalUsers
      onlineUsers
      totalProducts
      totalOrders
      pendingOrders
      processingOrders
      shippedOrders
      deliveredOrders
      cancelledOrders
      revenueTotal
      revenueToday
      revenueThisMonth
      bestSellers {
        ...ProductFields
      }
      lowStockProducts {
        ...ProductFields
      }
      recentOrders {
        id
        orderNumber
        status
        totalAmount
        createdAt
      }
    }
  }
`;
