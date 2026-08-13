type CartItem = {
  product_id: string;
  name: string;
  price_usd: number;
  image_url: string;
  quantity: number;
  store_name: string;
  warranty_days?: number;
  provider_name?: string | null;
};

type CartState = {
  items: CartItem[];
};

let cartState: CartState = { items: [] };
let listeners: Array<() => void> = [];

// Intenta cargar del localStorage al inicio (solo en cliente)
if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem("iamax_cart");
    if (saved) cartState = JSON.parse(saved);
  } catch (e) {
    console.error("Error loading cart", e);
  }
}

function saveCart() {
  if (typeof window !== "undefined") {
    localStorage.setItem("iamax_cart", JSON.stringify(cartState));
  }
}

function emitChange() {
  saveCart();
  for (let listener of listeners) {
    listener();
  }
}

export const cartStore = {
  addItem(item: Omit<CartItem, "quantity">) {
    const existing = cartState.items.find((i) => i.product_id === item.product_id);
    if (existing) {
      existing.quantity += 1;
      cartState = { ...cartState, items: [...cartState.items] };
    } else {
      cartState = { ...cartState, items: [...cartState.items, { ...item, quantity: 1 }] };
    }
    emitChange();
  },
  removeItem(product_id: string) {
    cartState = { ...cartState, items: cartState.items.filter((i) => i.product_id !== product_id) };
    emitChange();
  },
  updateQuantity(product_id: string, quantity: number) {
    if (quantity <= 0) {
      this.removeItem(product_id);
      return;
    }
    cartState = {
      ...cartState,
      items: cartState.items.map((i) => (i.product_id === product_id ? { ...i, quantity } : i)),
    };
    emitChange();
  },
  clear() {
    cartState = { items: [] };
    emitChange();
  },
  subscribe(listener: () => void) {
    listeners = [...listeners, listener];
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
  getSnapshot() {
    return cartState;
  },
  getServerSnapshot() {
    return { items: [] };
  }
};
