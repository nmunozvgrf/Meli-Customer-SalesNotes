const axios = require("axios");
const shell = require('shelljs');
//const fs = require("fs");
//const path = require("path");
const { obtenerTokenVendedor } = require("./token"); 
const { obtenerDatos } = require("./customer");
const mailer = require("./email");


const URL = "https://api.mercadolibre.com/orders/search?seller=2413572022&status=paid";

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
  return texto.replace(/ /g, "%20");
}

/*function changeTextTo23Segmentado(texto) {
  if (!texto) texto = "";

  // Reemplaza espacios reales por %20
  let textoCodificado = texto.replace(/ /g, "%20");

  // Contador de caracteres lógicos (%20 cuenta como 1)
  const contarCaracteresLogicos = (str) => {
    return str.split(/(%20)/).reduce((acc, part) => acc + (part === "%20" ? 1 : part.length), 0);
  };

  // Rellenar con %20 hasta llegar a 23 caracteres lógicos
  while (contarCaracteresLogicos(textoCodificado) < 23) {
    textoCodificado += "%20";
  }

  // Cortar si hay más de 23 caracteres lógicos
  const partes = textoCodificado.split(/(%20)/);
  let resultado = "";
  let cuenta = 0;

  for (const parte of partes) {
    const longitud = parte === "%20" ? 1 : parte.length;
    if (cuenta + longitud > 23) break;
    resultado += parte;
    cuenta += longitud;
  }

  // Ya tenemos exactamente 23 caracteres lógicos en `resultado`
  // Ahora vamos a segmentarlo en las 4 partes deseadas

  const segmentos = [];
  const longitudes = [7, 8, 5, 3];
  let acumulado = 0;

  for (const len of longitudes) {
    let segmento = "";
    let actualLogico = 0;

    while (actualLogico < len && acumulado < resultado.length) {
      const siguiente = resultado.slice(acumulado).startsWith("%20") ? "%20" : resultado[acumulado];
      const unidad = siguiente === "%20" ? "%20" : siguiente;
      const incremento = unidad === "%20" ? 3 : 1;

      segmento += resultado.slice(acumulado, acumulado + incremento);
      acumulado += incremento;
      actualLogico += 1;
    }

    segmentos.push(segmento);
  }

  // Unimos todos los segmentos en uno solo, separados o no, según se necesite
  return segmentos.join(""); // Puedes hacer join con "-" si quieres verlos separados
}*/



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

    if (!accessToken) {
      throw new Error("No se pudo obtener el token de acceso del vendedor.");
    }

    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    const { data } = await axios.get(URL, { headers });

    const pedidos = await Promise.all(data.results.map(async (order) => {
      const fechaObj = new Date(order.date_created);
      const Fecha = `${fechaObj.getDate().toString().padStart(2, '0')}${(fechaObj.getMonth() + 1).toString().padStart(2, '0')}${fechaObj.getFullYear()}`;
      const Hora = `${fechaObj.getHours().toString().padStart(2, '0')}:${fechaObj.getMinutes().toString().padStart(2, '0')}`;

      const buyerID = order.buyer.id || 'Sin Id Comprador';

      return {
        N_orden: await getNumber(),
        Precio: order.order_items?.[0]?.unit_price || "Sin Precio",
        Cantidad: order.order_items?.[0]?.quantity || "Sin Cantidad",
        Fecha,
        Hora,
        Sku: changeText(order.order_items?.[0]?.item?.seller_sku || "No Especificado"),
        Pago: order.paid_amount || "0",
        BuyerID: buyerID,  
      };
    }));

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
