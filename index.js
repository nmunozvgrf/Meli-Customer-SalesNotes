const { obtenerClientes,} = require('./customer');//obtenerDatos } = require('./customer');
const { obtenerPedidos, createOrder, } = require('./orders');
const {Sendmail} =require('./email');
const { obtenerTokenComprador, obtenerTokenVendedor } = require('./token');

async function ejecutar() {
  try {
    console.log("Obteniendo token del comprador...");
    const tokenComprador = await obtenerTokenComprador();
    console.log("Token Comprador obtenido:", tokenComprador);

    console.log("Obteniendo token del vendedor...");
    const tokenVendedor = await obtenerTokenVendedor();
    console.log("Token Vendedor obtenido:", tokenVendedor);

    console.log("Obteniendo pedidos...");
    await obtenerPedidos(tokenComprador); 
    await createOrder();
    
    console.log("Obteniendo clientes...");
    await obtenerClientes(tokenVendedor); 
    //await obtenerDatos();
   
    console.log("Obteniendo email...");
    //await Sendmail(); 

  } catch (error) {
    console.error("Error en la ejecución:", error.message);
  }
}

ejecutar();
