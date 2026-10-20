import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { logUserActivity } from '../services/activityTracker';

const CartContext = createContext(null);
const CART_STORAGE_KEY = 'xamtoppr-books-cart';

const readStoredCart = () => {
  try {
    const storedCart = localStorage.getItem(CART_STORAGE_KEY);
    const parsedCart = storedCart ? JSON.parse(storedCart) : [];
    return Array.isArray(parsedCart)
      ? parsedCart.filter((book) => book && typeof book.id === 'string' && typeof book.title === 'string')
      : [];
  } catch (error) {
    console.error('Unable to load the saved cart:', error);
    return [];
  }
};

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(readStoredCart);
  const cartItemsRef = useRef(cartItems);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (error) {
      console.error('Unable to save the cart:', error);
    }
  }, [cartItems]);

  const addToCart = (product) => {
    const productId = product?.sanityId || product?.id;
    if (!productId || !product?.title) {
      throw new Error('A valid product is required to add it to the cart.');
    }
    if (cartItemsRef.current.some((item) => item.id === productId)) return;

    const nextItems = [...cartItemsRef.current, {
      id: productId,
      sanityId: product.sanityId || productId,
      productType: product.productType || 'book',
      packPurpose: product.packPurpose || '',
      slug: product.slug || '',
      title: product.title,
      price: Number(product.offerPrice ?? product.price) || 0,
      displayPrice: product.displayPrice || '',
      coverImage: product.coverImage || '',
      pdfUrl: product.pdfUrl || '',
      samplePdfUrl: product.samplePdfUrl || ''
    }];
    cartItemsRef.current = nextItems;
    setCartItems(nextItems);
    void logUserActivity('add_to_cart', product.productType === 'videoCoursePack'
      ? { courseId: productId, courseTitle: product.title, productType: 'videoCoursePack' }
      : { bookId: productId, bookTitle: product.title, productType: 'book' });
  };

  const removeFromCart = (bookId) => {
    const nextItems = cartItemsRef.current.filter((book) => book.id !== bookId);
    cartItemsRef.current = nextItems;
    setCartItems(nextItems);
  };

  const clearCart = () => {
    cartItemsRef.current = [];
    setCartItems([]);
  };
  const cartTotal = useMemo(
    () => cartItems.reduce((total, book) => total + (Number(book.price) || 0), 0),
    [cartItems]
  );

  const value = useMemo(() => ({
    addToCart,
    removeFromCart,
    clearCart,
    cartItems,
    cartTotal
  }), [cartItems, cartTotal]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider.');
  return context;
}
