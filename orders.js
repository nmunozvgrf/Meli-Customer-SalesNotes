const axios = require("axios");
const { obtenerTokenVendedor } = require("./token");

const URL = "https://api.mercadolibre.com/orders/search?seller=2257183696&status=paid";

// Función para obtener el número de orden ejecutando un script externo
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

    const pedidos = data.results.map(async (order) => ({
      
        N_orden: await getNumber(),
        Producto: order.order_items?.[0]?.item?.title || "Sin Producto",
        Precio: order.order_items?.[0]?.unit_price || "Sin Precio",
        Cantidad: order.order_items?.[0]?.quantity || "Sin Cantidad",
        tipo_pago: order.payments?.[0]?.payment_type || "No Especificado",
        fecha: new Date(order.date_created).toLocaleDateString('es-ES').split('/').reverse().join('') || "No Especificada",
        hora: new Date(order.date_created).toLocaleTimeString() || "No Especificada",
        sku: order.order_items?.[0]?.item?.seller_sku || "No Especificado",
      }));
  
    return pedidos;
  } catch (error) {
    console.error("Error obteniendo las órdenes:", error.response?.data || error.message);
    return [];
  }
}


function createOrder(order) {
  // Verificar que la orden y los datos necesarios estén definidos
  if (!order || !order.buyer || !order.order_items || order.order_items.length === 0) {
    console.error('Error: Datos de la orden insuficientes.');
    return false;
  }

  // Extraer datos del comprador y del primer artículo de la orden
  const comprador = order.buyer;
  const item = order.order_items[0].item;

  // Construir el comando para crear el cliente
  const comandoCrear = `sh /data/create_order.sh"${comprador.id}|${comprador.nickname}|${comprador.address?.address || 'Dirección no disponible'}|${comprador.address?.city?.name || 'Comuna no disponible'}|${comprador.address?.state?.name || 'Ciudad no disponible'}|GiroEjemplo|${comprador.phone?.number || 'Teléfono no disponible'}|${comprador.phone?.number || 'Teléfono no disponible'}|${comprador.phone?.number || 'Teléfono no disponible'}|${comprador.nickname}|TipoUsuarioEjemplo|${order.date_created}|${order.date_created}|Numero1Ejemplo|Numero2Ejemplo|Numero3Ejemplo|Numero4Ejemplo|${comprador.phone?.number || 'Teléfono no disponible'}|${comprador.email || 'email@ejemplo.com'}"`;

  console.log("Verificando creación del cliente...");

  // Ejecutar el comando en el shell
  let salidaCrear = shell.exec(comandoCrear, { silent: true });
  if (!salidaCrear || salidaCrear.code !== 0) {
    console.error('Error: Creación fallida.');
    console.error('Salida del script:', salidaCrear.stderr || salidaCrear.stdout);
    return false;
  }

  console.log(`Cliente ${comprador.id} creado correctamente.`);
  return true;
}



module.exports = { obtenerPedidos, createOrder,};