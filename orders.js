const axios = require("axios");
const { obtenerTokenVendedor } = require("./token");

const URL = "https://api.mercadolibre.com/orders/search?seller=2257183696&status=paid";

// Función para obtener el número de orden ejecutando un script externo
async function getNumber() {
  try {
    const output = shell.exec(sh /data/getnumber_order.sh, { silent: true });

    if (output.code !== 0) {
      throw new Error(`Error ejecutando el script: ${output.stderr}`);
    }

    const result = output.stdout.trim();

    if (!result) {
      throw new Error("El script no devolvió un número válido.");
    }

    return result;
  } catch (error) {
    console.error("Error ejecutando el script para obtener el número de orden:", error.message);
    return null;
  }
}

// Función para obtener los pedidos del vendedor
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

    const pedidos = data.results.map((order) => ({
      id: order.id,
      fecha_creacion: order.date_created,
      estado: order.status,
      total: order.total_amount,
      comprador_id: order.buyer.id,
      items: order.order_items.map((item) => ({
        id: item.item.id,
        título: item.item.title,
        cantidad: item.quantity,
        precio_unitario: item.unit_price,
      })),
    }));

    return pedidos;
  } catch (error) {
    console.error("Error obteniendo las órdenes:", error.response?.data || error.message);
    return [];
  }
}

module.exports = { obtenerPedidos};