class ApiClient {
    constructor() {
        // Dynamically detect the project root
        const path = window.location.pathname;
        let projectRoot = '/';
        
        const lowerPath = path.toLowerCase();
        if (lowerPath.includes('/golaowntotheworld/')) {
            projectRoot = path.substring(0, lowerPath.indexOf('/golaowntotheworld/') + 18) + '/';
        } else if (lowerPath.includes('/golaown/')) {
            projectRoot = path.substring(0, lowerPath.indexOf('/golaown/') + 9) + '/';
        }
        
        this.baseURL = projectRoot;
        console.log('ApiClient initialized. Base URL:', this.baseURL);
        this.currentUser = this.loadUser();
    }

    // User Management
    async register(userData) {
        try {
            const response = await fetch(`${this.baseURL}api/auth?action=register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            const text = await response.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch (e) {
                console.error('Registration parse error:', text);
                return { success: false, error: 'Invalid server response: ' + text.substring(0, 100) };
            }
            
            if (response.ok && result.success) {
                return { success: true, data: result };
            } else {
                return { success: false, error: result.error || 'Registration failed' };
            }
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: 'Network error: ' + error.message };
        }
    }

    async login(email, password) {
        try {
            const response = await fetch(`${this.baseURL}api/auth?action=login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const text = await response.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch (e) {
                console.error('Failed to parse JSON response:', text);
                return { success: false, error: 'Invalid server response: ' + text.substring(0, 100) };
            }
            
            if (response.ok && result.success) {
                this.saveUser(result.user);
                this.currentUser = result.user;
                return { success: true, data: result };
            } else {
                return { success: false, error: result.error || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'API Error: ' + error.message };
        }
    }

    logout() {
        localStorage.removeItem('currentUser');
        this.currentUser = null;
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    // Product Management
    async getProducts(params = {}) {
        try {
            const queryParams = new URLSearchParams(params).toString();
            const response = await fetch(`${this.baseURL}api/products?${queryParams}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            
            if (result.success) {
                return { success: true, data: result.data };
            } else {
                return { success: false, error: result.error || result.message || 'API error' };
            }
        } catch (error) {
            console.error('ApiClient Error:', error);
            return { success: false, error: 'Network error: ' + error.message };
        }
    }

    async getProduct(productId) {
        try {
            const response = await fetch(`${this.baseURL}api/products?id=${productId}`);
            const result = await response.json();
            
            if (response.ok && result.success) {
                return { success: true, data: result.data };
            } else {
                return { success: false, error: (result && result.error) ? result.error : 'Product not found' };
            }
        } catch (error) {
            console.error('getProduct error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    // Cart Management
    async addToCart(productIdOrObject, quantity = 1, size = 'M') {
        try {
            const productId = typeof productIdOrObject === 'object' ? productIdOrObject.id : productIdOrObject;
            
            // For now, using local cart logic if API not ready
            let cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
            const existingItem = cartItems.find(i => i.id === productId && i.size === size);
            
            if (existingItem) {
                existingItem.quantity = (parseInt(existingItem.quantity) || 0) + parseInt(quantity);
            } else {
                let productData;
                if (typeof productIdOrObject === 'object') {
                    productData = productIdOrObject;
                } else {
                    const result = await this.getProduct(productId);
                    if (result.success && result.data) {
                        productData = Array.isArray(result.data) ? result.data[0] : result.data;
                    }
                }
                
                if (productData && productData.id) {
                    cartItems.push({ ...productData, quantity: parseInt(quantity), size });
                } else {
                    console.error('Failed to add to cart: Product data missing for ID', productId);
                    return { success: false, error: 'Product details could not be found.' };
                }
            }
            
            localStorage.setItem('cartItems', JSON.stringify(cartItems));
            await this.refreshCartCount();
            return { success: true };
        } catch (error) {
            console.error('Add to cart error:', error);
            return { success: false, error: 'Failed to add to cart' };
        }
    }

    async getCart() {
        try {
            const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
            return { success: true, data: cartItems };
        } catch (error) {
            return { success: false, error: 'Failed to load cart' };
        }
    }

    async refreshCartCount() {
        const cartCountEl = document.getElementById('cart-count') || document.getElementById('cartCount');
        if (!cartCountEl) return;

        try {
            const result = await this.getCart();
            if (result.success) {
                const totalItems = result.data.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
                cartCountEl.textContent = totalItems;
                localStorage.setItem('cartCount', totalItems); // Sync for legacy pages
            }
        } catch (error) {
            console.error('Error refreshing cart count:', error);
        }
    }

    async updateCartItem(productId, quantity, size = 'M') {
        try {
            let cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
            const item = cartItems.find(i => i.id == productId && (i.size || 'M') == size);
            
            if (item) {
                if (quantity > 0) {
                    item.quantity = quantity;
                } else {
                    cartItems = cartItems.filter(i => !(i.id == productId && (i.size || 'M') == size));
                }
                localStorage.setItem('cartItems', JSON.stringify(cartItems));
                this.refreshCartCount();
                return { success: true };
            }
            return { success: false, error: 'Item not found in cart' };
        } catch (error) {
            return { success: false, error: 'Failed to update cart' };
        }
    }

    async removeFromCart(productId, size = 'M') {
        try {
            let cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
            const newCart = cartItems.filter(i => !(i.id == productId && (i.size || 'M') == size));
            
            if (newCart.length !== cartItems.length) {
                localStorage.setItem('cartItems', JSON.stringify(newCart));
                this.refreshCartCount();
                return { success: true };
            }
            return { success: false, error: 'Item not found' };
        } catch (error) {
            return { success: false, error: 'Failed to remove item' };
        }
    }

    // Order Management
    async createOrder(orderData) {
        try {
            const response = await fetch(`${this.baseURL}api/orders?action=create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData)
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                return { success: true, data: result, orderNumber: result.orderNumber };
            } else {
                return { success: false, error: result.error || 'Failed to create order' };
            }
        } catch (error) {
            console.error('Create order error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    async getOrders() {
        try {
            const response = await fetch(`${this.baseURL}api/admin?action=orders`);
            const result = await response.json();
            return result;
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }

    async getOrder(orderId) {
        try {
            const response = await fetch(`${this.baseURL}api/orders?orderNumber=${orderId}`);
            const result = await response.json();
            return result;
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }

    async trackOrder(orderNumber) {
        try {
            const response = await fetch(`${this.baseURL}api/orders?orderNumber=${orderNumber}`);
            const result = await response.json();
            
            if (response.ok && result.success) {
                return { success: true, data: result.data };
            } else {
                return { success: false, error: result.error || 'Order not found' };
            }
        } catch (error) {
            console.error('Track order error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    async createStripePaymentIntent(amount) {
        try {
            const response = await fetch(`${this.baseURL}api/orders?action=stripe-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ amount })
            });

            const result = await response.json();
            return result;
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }

    async capturePayPalOrder(orderID) {
        try {
            const response = await fetch(`${this.baseURL}api/orders?action=paypal-capture`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ orderID })
            });

            const result = await response.json();
            return result;
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }

    // User Profile Management
    async updateProfile(userData) {
        try {
            const response = await fetch(`${this.baseURL}api/auth?action=update-profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                this.saveUser(result.user);
                this.currentUser = result.user;
                return { success: true, data: result };
            } else {
                return { success: false, error: result.error || 'Update failed' };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }

    async changePassword(oldPassword, newPassword) {
        try {
            const response = await fetch(`${this.baseURL}api/auth?action=change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ oldPassword, newPassword })
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                return { success: true, data: result };
            } else {
                return { success: false, error: result.error || 'Password change failed' };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }


    // Local Storage Helpers
    saveUser(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    }

    loadUser() {
        const userData = localStorage.getItem('currentUser');
        return userData ? JSON.parse(userData) : null;
    }

    // Utility Methods
    formatPrice(price) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(price);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    showNotification(message, type = 'success') {
        // Remove existing notifications
        const existing = document.querySelectorAll('.premium-notification');
        existing.forEach(n => {
            n.style.transform = 'translateX(120%)';
            setTimeout(() => n.remove(), 300);
        });

        const notification = document.createElement('div');
        notification.className = `premium-notification ${type}`;
        
        const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
        
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${icon}"></i>
                <span>${message}</span>
            </div>
            <div class="notification-progress"></div>
        `;
        
        // Styles are in styles.css for cleaner code, but adding inline as fallback
        notification.style.cssText = `
            position: fixed;
            top: 30px;
            right: 30px;
            background: ${type === 'success' ? '#000' : '#d90000'};
            color: #fff;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            min-width: 280px;
            overflow: hidden;
            transform: translateX(120%);
            transition: transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            font-family: 'Inter', sans-serif;
        `;
        
        document.body.appendChild(notification);
        
        // Force reflow
        notification.offsetHeight;
        
        // Animate in
        notification.style.transform = 'translateX(0)';
        
        // Auto-remove
        const duration = 4000;
        setTimeout(() => {
            notification.style.transform = 'translateX(120%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    notification.remove();
                }
            }, 500);
        }, duration);
    }
    // Admin Methods
    async getAdminOrders() {
        try {
            const response = await fetch(`${this.baseURL}golaown-php/php/admin.php?action=orders`);
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error fetching admin orders:', error);
            return { success: false, error: error.message };
        }
    }

    async getAdminUsers() {
        try {
            const response = await fetch(`${this.baseURL}api/admin?action=users`);
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error fetching admin users:', error);
            return { success: false, error: error.message };
        }
    }

    async getAdminStats() {
        try {
            const response = await fetch(`${this.baseURL}api/admin?action=stats`);
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error fetching admin stats:', error);
            return { success: false, error: error.message };
        }
    }

    async createProduct(productData) {
        try {
            const response = await fetch(`${this.baseURL}api/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(productData)
            });

            const result = await response.json();
            return { success: response.ok && result.success, ...result };
        } catch (error) {
            console.error('API error:', error);
            return { success: false, error: 'API Error: ' + error.message };
        }
    }

    async updateProduct(id, productData) {
        try {
            const response = await fetch(`${this.baseURL}api/products?id=${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(productData)
            });

            const result = await response.json();
            return { success: response.ok && result.success, ...result };
        } catch (error) {
            console.error('Update product error:', error);
            return { success: false, error: 'API Error: ' + error.message };
        }
    }

    async deleteProduct(id) {
        try {
            const response = await fetch(`${this.baseURL}api/products?id=${id}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            return { success: response.ok && result.success, ...result };
        } catch (error) {
            console.error('Delete product error:', error);
            return { success: false, error: 'API Error: ' + error.message };
        }
    }
}

// Initialize API client globally
window.api = new ApiClient();

// Global UI Navigation Functions
window.openSearch = function() {
    window.location.href = 'search.html';
};

window.openAccount = function() {
    window.location.href = 'account.html';
};

window.openCart = function() {
    window.location.href = 'cart.html';
};

window.toggleMobileMenu = function() {
    const nav = document.querySelector('.nav-menu');
    if (!nav) return;
    nav.classList.toggle('active');
    
    // Add backdrop if active
    let backdrop = document.querySelector('.menu-backdrop');
    if (nav.classList.contains('active')) {
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'menu-backdrop';
            backdrop.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:999;';
            backdrop.onclick = window.toggleMobileMenu;
            document.body.appendChild(backdrop);
        }
    } else if (backdrop) {
        backdrop.remove();
    }
};

// Global scroll effect for premium header
window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    if (!header) return;
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        header.style.background = 'rgba(255, 255, 255, 0.98)';
        header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
    } else {
        header.style.background = 'rgba(255, 255, 255, 0.95)';
        header.style.boxShadow = 'none';
    }
});

// Update cart count globally
document.addEventListener('DOMContentLoaded', () => {
    if (window.api) {
        window.api.refreshCartCount();
    }
});
