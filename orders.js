const axios = require("axios");
const { obtenerTokenVendedor } = require("./token"); 

const URL = "https://api.mercadolibre.com/orders/search?seller=2257183696&status=paid";

async function obtenerPedidos() {
  try {
    const accessToken = await obtenerTokenVendedor(); 

    if (!accessToken) {
      throw new Error("No se pudo obtener el token de acceso del vendedor.");
    }

    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    const { data } = await axios.get(URL, { headers });

    const Pedidos = data.results
      .filter((pedido) => pedido.status === "paid")
      .map(order => ({
        Producto: order.order_items?.[0]?.item?.title || "Sin Producto",
        Precio: order.order_items?.[0]?.unit_price || "Sin Precio",
        Cantidad: order.order_items?.[0]?.quantity || "Sin Cantidad",
        tipo_pago: order.payments?.[0]?.payment_type || "No Especificado",
      }));

    return Pedidos;
  } catch (error) {
    console.error("Error obteniendo las órdenes:", error.response?.data || error.message);
    return [];
  }
}

module.exports = { obtenerPedidos };
