const axios = require("axios");
const shell = require('shelljs');
//const fs = require("fs");
//const path = require("path");
const { obtenerTokenVendedor } = require("./token"); 
const { obtenerDatos } = require("./customer");
const mailer = require("./email");


const URL = "https://api.mercadolibre.com/orders/search?seller=2417067960&status=paid";

//Variables que se repiten 
const nulo = 'null';
const blanco = '';
const cero = '0';
const uno = '1';
const sucursal = '3';
const numeroE = '7555';
const numeroF = '1435';
const ceroUno = '01';
const numeroD = '20241211';
const once = '11';
const nuloCero = 'nullnull0';
const nullZero = 'nullnull00null';

//Coloca un %20 cuando hay espacio
function changeText(texto){
  if (!texto) return "Sin Datos";
  return texto.replace(/ /g, "%20")
              .replace(/_/g, "%20");
}

//Generador de muenros de la orden
async function getNumber() {
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

//Obtiene las ordenes del URL de MercadoLibre
async function obtenerPedidos() {
  try {
    const accessToken = await obtenerTokenVendedor();
    if (!accessToken) throw new Error("No se pudo obtener el token.");

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    let pedidos = [];
    let offset = 0;
    let total = 0;

    do {
      const response = await axios.get(`${URL}&offset=${offset}&limit=50`, { headers });
      const data = response.data;

      total = data.paging.total;
      offset += data.paging.limit;

      const nuevosPedidos = await Promise.all(data.results.map(async (order) => {
        const fechaObj = new Date(order.date_created);
        const Fecha = `${fechaObj.getFullYear()}${(fechaObj.getMonth() + 1).toString().padStart(2, '0')}${fechaObj.getDate().toString().padStart(2, '0')}`;
        const Hora = `${fechaObj.getHours().toString().padStart(2, '0')}:${fechaObj.getMinutes().toString().padStart(2, '0')}`;

        const buyerID = order.buyer.id || 'Sin Id Comprador';
        const skuOriginal = order.order_items?.[0]?.item?.seller_sku || "No Especificado";
        const skuTransformado = changeText(skuOriginal);
        
        return {
          Precio: order.order_items?.[0]?.unit_price || "Sin Precio",
          Cantidad: order.order_items?.[0]?.quantity || "Sin Cantidad",
          Fecha,
          Hora,
          Sku: skuTransformado,
          Pago: order.paid_amount || "0",
          BuyerID: buyerID,  
        };
      }));

      pedidos.push(...nuevosPedidos);

    } while (offset < total);

    return pedidos;
  } catch (error) {
    console.error("Error obteniendo las órdenes:", error.response?.data || error.message);
    return [];
  }
}


//Enviar un correo electronico si los ID de Compra NO coincide
async function enviarCorreoAlerta(buyerID) {
  const destinatario = process.env.ALERTA_EMAIL || "nmunoz@vigfor.cl";
  const asunto = `📦 Mercado Libre - Cliente de la Orden`; //(${process.env.AMBIENTE})

  const body_mail = `
    <p><strong>Alerta:</strong> El BuyerID recibido <b>${buyerID}</b> desde Mercado Libre no coincide.</p>
    <p>Por esta razón <b>NO se puede crear la orden de venta</b> correspondiente.</p>
  `;
  const texto_plano = `BuyerID no coincide (${buyerID}) y no se puede crear la orden de venta.`;

  await mailer.send365Email(destinatario, asunto, body_mail, texto_plano);
}

//Funcion de crear la nota de venta 
async function createOrder() {
  const pedidos = await obtenerPedidos();
  const datosCombinados = await obtenerDatos();

  if (!datosCombinados || !datosCombinados.Datos) {
    console.error("No se pudieron obtener los datos combinados.");
    return false;
  }

  if (pedidos.length === 0) {
    console.log("No hay pedidos para procesar.");
    return false;
  }

  const idCompradorNormalizado = String(datosCombinados.Datos.Id_Comprador).trim().toLowerCase();

  const pedidosPorBuyerID = {}; //  Agrupar por BuyerID
  pedidos.forEach(pedido => {
    const buyerID = String(pedido.BuyerID).trim().toLowerCase();
    if (!pedidosPorBuyerID[buyerID]) {
      pedidosPorBuyerID[buyerID] = [];
    }
    pedidosPorBuyerID[buyerID].push(pedido);
  });

  const pedidosCoincidentes = [];

  for (const buyerID in pedidosPorBuyerID) {
    const pedidosDeEsteBuyer = pedidosPorBuyerID[buyerID];

    if (buyerID !== idCompradorNormalizado) {
      await enviarCorreoAlerta(buyerID);
      continue;
    }

    pedidosCoincidentes.push(...pedidosDeEsteBuyer);
  }

  if (pedidosCoincidentes.length === 0) {
    console.log("Ningún pedido coincide con el ID de comprador.");
    return false;
  }

  for (const pedido of pedidosCoincidentes) {
    const numeroOrden = await getNumber();
    if (!numeroOrden) {
      console.error(`No se pudo obtener el número de orden para BuyerID: ${pedido.BuyerID}`);
      continue;
    }

    const comandoCrear = `sh /data/create_order.sh "${numeroOrden};${datosCombinados.Datos.fecha_Creacion};${datosCombinados.Datos.Rut};${datosCombinados.Datos.Nombre};${datosCombinados.Datos.Direccion};${datosCombinados.Datos.Ciudad};${datosCombinados.Datos.Telefono};${datosCombinados.Datos.Telefono};${datosCombinados.giro};${nulo};${pedido.Pago};${cero};${cero};${pedido.Pago};${uno};${datosCombinados.tipo_Usuario};${once};${datosCombinados.tipo_Usuario};${blanco};${blanco};${once};${nuloCero};${blanco};${datosCombinados.Datos.hora};${blanco};${blanco};${blanco};${blanco};${blanco};${blanco};${blanco};${blanco};${datosCombinados.Datos.Email};${nulo};${numeroD};${blanco};${blanco};${numeroE};${ceroUno};${uno};${numeroF};${cero};${nullZero}|${numeroOrden};${ceroUno};${pedido.Sku};${sucursal};${pedido.Cantidad};${numeroE};${cero};${pedido.Fecha};${pedido.Hora};${pedido.Precio}"`;

    console.log("Ejecutando comando:", comandoCrear);

    let salidaCrear = shell.exec(comandoCrear, { silent: true });
    if (!salidaCrear || salidaCrear.code !== 0) {
      console.error("Error al crear la orden.");
      console.error("Salida:", salidaCrear.stderr || salidaCrear.stdout);
      continue;
    }

    console.log(`Nota de venta para la orden ${numeroOrden} creada exitosamente.`);
  }

  return true;
}


//Exportar a otros archivos
module.exports = { obtenerPedidos, createOrder };
