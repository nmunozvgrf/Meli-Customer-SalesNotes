const axios = require("axios");
const { obtenerTokenVendedor } = require("./token"); 
const { obtenerDatos } = require("./customer");
const shell = require('shelljs');

const URL = "https://api.mercadolibre.com/orders/search?seller=2257183696&status=paid";

function getNumber() {
  try {
    const output = shell.exec(`sh /data/getnumber_order.sh`, { silent: true });

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

// Función para comparar y unir datos si los IDs coinciden
async function compararYUnirDatos(order) {
  try {
    const datosCliente = await obtenerDatos();

    if (!datosCliente || !datosCliente.Datos || !datosCliente.Datos.Id_Comprador) {
      console.error("No se pudo obtener el Id_Comprador del cliente.");
      return null;
    }

    const idComprador = datosCliente.Datos.Id_Comprador;
    const idBuyer = order.buyer.id || null;

    if (idBuyer && idBuyer === idComprador) {
      // Si los IDs coinciden, unir datos sin mostrar los IDs
      const { Id_Comprador, ...datosSinID } = datosCliente.Datos;

      return {
        ...datosSinID, // Agrega los datos del cliente sin el ID
        Numero_orden: await getNumber(),
        Producto: order.order_items?.[0]?.item?.title || "Sin Producto",
        Precio: order.order_items?.[0]?.unit_price || "Sin Precio",
        Cantidad: order.order_items?.[0]?.quantity || "Sin Cantidad",
        tipo_pago: order.payments?.[0]?.payment_type || "No Especificado",
        fecha: new Date(order.date_created).toLocaleDateString() || "No Especificada",
        hora: new Date(order.date_created).toLocaleTimeString() || "No Especificada",
  
      };
    } else {
      return null; // No coinciden, no se une la información
    }
  } catch (error) {
    console.error("Error comparando y uniendo datos:", error.message);
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

    const pedidos = await Promise.all(data.results
      .filter((pedido) => pedido.status === "paid")
      .map(async (order) => await compararYUnirDatos(order))
    );

    return pedidos.filter((pedido) => pedido !== null); // Filtra solo los que coinciden
  } catch (error) {
    console.error("Error obteniendo las órdenes:", error.response?.data || error.message);
    return [];
  }
}

module.exports = { obtenerPedidos };
