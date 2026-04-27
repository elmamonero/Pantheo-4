// ... (mismo código de antes hasta llegar al setTimeout)

    // --- LÓGICA DE CONTROL DE TIEMPO ---
    if (!global.facturaTimeouts) global.facturaTimeouts = {};
    
    // Si por alguna razón ya existía un proceso para este ID, lo borramos
    if (global.facturaTimeouts[idFactura]) clearTimeout(global.facturaTimeouts[idFactura]);

    await conn.sendMessage(chatId, { image: buffer, caption }, { quoted: msg });

    // Guardamos la alarma en el registro global
    global.facturaTimeouts[idFactura] = setTimeout(async () => {
      const aviso = `⏰ *AVISO DE VENCIMIENTO* ⏰\n\nEl servicio *${servicio}* ha vencido.\n\n👤 *Cliente:* ${nombreCliente} (${numCliente})\n📄 *ID Factura:* ${idFactura}\n💰 *Precio:* $${precio.toFixed(2)}\n\n_Ya puedes avisar al cliente manualmente._`;
      
      await conn.sendMessage(chatId, { text: aviso });
      
      // Limpiar el registro después de que se ejecute
      delete global.facturaTimeouts[idFactura];
    }, cicloParsed.ms);

// ... (resto del código)
