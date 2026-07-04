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

export const GET_ME = gql`
  query Me {
    me {
      id
      email
      firstName
      lastName
      phone
      avatar
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
