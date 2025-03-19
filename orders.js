const axios = require("axios");
const { obtenerTokenVendedor } = require("./token"); 
const shell = require('shelljs');

const URL = "https://api.mercadolibre.com/orders/search?seller=2257183696&status=paid";

async function getNumber() {
  try{
    const output = shell.exec("sh/data/getnumber_order.sh",{silent: true}).stdout.trim();
    if (!output) throw new Error("NO se puede obtener el N° de orden.");
    return output;
  }catch (error){
    console.error("Error al obtener el N° de orden.");
    return null;
  }
  
}




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

    const numberOrder = await getNumber();

    const Pedidos = data.results
      .filter((pedido) => pedido.status === "paid")
      .map(order => {
        const fechaHora = order.date_created ? new Date(order.date_created) : null;
        const fecha = fechaHora ? fechaHora.toLocaleDateString() : "No Especificada";
        const hora = fechaHora ? fechaHora.toLocaleTimeString() : "No Especificada";

        return {
          Numero_orden: numberOrder,
          Producto: order.order_items?.[0]?.item?.title || "Sin Producto",
          Precio: order.order_items?.[0]?.unit_price || "Sin Precio",
          Cantidad: order.order_items?.[0]?.quantity || "Sin Cantidad",
          tipo_pago: order.payments?.[0]?.payment_type || "No Especificado",
          fecha: fecha,
          hora: hora,
        };
      });

    return Pedidos;
  } catch (error) {
    console.error("Error obteniendo las órdenes:", error.response?.data || error.message);
    return [];
  }
}

module.exports = { obtenerPedidos };
