package com.dietetica.lembas.content.service;

import com.dietetica.lembas.content.dto.FaqDto;
import com.dietetica.lembas.content.dto.FaqItemDto;
import com.dietetica.lembas.content.dto.TermsDto;
import com.dietetica.lembas.content.dto.TermsSectionDto;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

/**
 * Read-only content provider for the public store legal and FAQ pages.
 *
 * <p>The content is currently hard-coded in the application. It is exposed
 * through plain DTOs so the storage strategy can later be swapped (database
 * table, Markdown files, headless CMS) without changing the public API.</p>
 *
 * <p>The legal text is tailored to an Argentine e-commerce for a small
 * health-food retailer (Dietetica Lembas) and is grounded in:</p>
 * <ul>
 *   <li>Ley 24.240 de Defensa del Consumidor (Art. 4 - informacion al consumidor;
 *       Arts. 10 a 17 - garantia legal; Art. 34 y Art. 1110 CCyCN - revocacion en
 *       ventas a distancia; Art. 10 ter - baja de servicios).</li>
 *   <li>Art. 1116 del Codigo Civil y Comercial de la Nacion y Art. 3 de la
 *       Disposicion 954/2025 (excepciones al derecho de arrepentimiento, en
 *       particular productos perecederos).</li>
 *   <li>Ley 25.326 de Proteccion de los Datos Personales (derechos ARCO;
 *       autoridad de aplicacion: AAIP).</li>
 *   <li>Resolucion General 4291/2018 y modif. de AFIP/ARCA (regimen de
 *       comprobantes electronicos).</li>
 *   <li>Las reglas de negocio del dominio documentadas en {@code docs/02-domain/}.</li>
 * </ul>
 *
 * <p>This service has no dependencies and is safe to call from the
 * controller layer without transactions.</p>
 */
@Service
public class LegalContentService {

    /** ISO-8601 date the terms and FAQ were last updated. */
    private static final LocalDate LAST_UPDATED = LocalDate.of(2026, 6, 1);

    // ---------------------------------------------------------------------------
    // Datos del proveedor
    // ---------------------------------------------------------------------------
    private static final String BUSINESS_NAME = "Dietetica Lembas";
    private static final String BUSINESS_ADDRESS = "Av. Siempre Viva 123, Cordoba Capital, Argentina";
    private static final String BUSINESS_HOURS = "Lunes a sabados en horario de atencion al publico";
    private static final String CONTACT_EMAIL = "hola@dieteticalembas.com";
    private static final String CONTACT_PHONE = "+54 351 555-0001";
    private static final String JURISDICTION = "Tribunales ordinarios de la ciudad de Cordoba Capital, Argentina";

    /** Returns the full terms and conditions document. */
    public TermsDto getTerms() {
        List<TermsSectionDto> sections = List.of(
                new TermsSectionDto(
                        "1. Identificacion del proveedor",
                        List.of(
                                "Los productos ofrecidos en este sitio son comercializados por "
                                        + BUSINESS_NAME + " (en adelante, \"Lembas\"), con domicilio comercial en "
                                        + BUSINESS_ADDRESS + ". Para cualquier consulta, reclamo o ejercicio de "
                                        + "derechos, podes contactarnos por los canales indicados en la seccion 14."
                        ),
                        List.of(
                                "Razon social: " + BUSINESS_NAME,
                                "Domicilio: " + BUSINESS_ADDRESS,
                                "Email: " + CONTACT_EMAIL,
                                "Telefono: " + CONTACT_PHONE,
                                "Atencion: " + BUSINESS_HOURS
                        )
                ),
                new TermsSectionDto(
                        "2. Informacion al consumidor y caracteristicas de los productos",
                        List.of(
                                "Las fotos, descripciones, precios y stock exhibidos en el sitio son meramente "
                                        + "informativos y pueden variar sin previo aviso. La informacion publicada "
                                        + "tiene por objeto cumplimentar lo requerido por el articulo 4 de la Ley "
                                        + "24.240 (informacion al consumidor) y la Resolucion General 4291/2018 y "
                                        + "modificatorias de AFIP/ARCA (regimen de comprobantes electronicos).",
                                "Los precios estan expresados en pesos argentinos (ARS) e incluyen el IVA. El stock "
                                        + "mostrado es por sucursal y se calcula en tiempo real a partir de los lotes "
                                        + "fisicos disponibles; puede variar entre sucursales. La aplicacion del "
                                        + "sistema de gestion es la que determina el stock disponible al momento de "
                                        + "confirmar el pago.",
                                "Los productos comercializados son alimentos, suplementos dietarios y articulos de "
                                        + "dietetica. Lembas no realiza afirmaciones sobre propiedades terapeuticas y "
                                        + "recomienda consultar a un profesional de la salud antes de iniciar cualquier "
                                        + "regimen alimentario o de suplementacion."
                        ),
                        List.of()
                ),
                new TermsSectionDto(
                        "3. Registro de cuenta",
                        List.of(
                                "Para realizar un pedido online es necesario estar registrado como cliente. El "
                                        + "registro es gratuito y requiere proporcionar datos veridicos y completos. "
                                        + "Sos responsable de mantener la confidencialidad de tu contrasena y de "
                                        + "todas las operaciones realizadas desde tu cuenta.",
                                "Lembas puede suspender o cancelar cuentas que contengan informacion falsa, que "
                                        + "se utilicen de forma fraudulenta o que violen estas condiciones."
                        ),
                        List.of()
                ),
                new TermsSectionDto(
                        "4. Carrito y armado del pedido",
                        List.of(
                                "El carrito de compras se almacena localmente en tu navegador (localStorage). Si "
                                        + "cambias de dispositivo o borras los datos del navegador, perderas el "
                                        + "carrito y deberas armarlo de nuevo. Lembas no conserva copias del carrito "
                                        + "en el servidor.",
                                "Antes de confirmar el pago, podes revisar y modificar libremente el contenido del "
                                        + "carrito. Una vez confirmado el pago, el pedido no se puede modificar; si "
                                        + "necesitas correcciones, deberas cancelarlo (segun las reglas de la seccion 7) "
                                        + "y volver a armarlo."
                        ),
                        List.of()
                ),
                new TermsSectionDto(
                        "5. Confirmacion y estado del pedido",
                        List.of(
                                "Luego de la creacion del pedido y hasta la confirmacion del pago, el pedido queda "
                                        + "en estado PENDIENTE DE PAGO. Cuando el pago se aprueba, pasa a PAGADO y "
                                        + "se descuenta el stock. A partir de alli sigue las etapas EN PREPARACION y "
                                        + "LISTO PARA RETIRAR, hasta que te lo entregamos en la sucursal (RETIRADO).",
                                "El seguimiento del pedido se hace exclusivamente desde la seccion \"Mis pedidos\" "
                                        + "de tu cuenta. Lembas no envia notificaciones automaticas por email, "
                                        + "WhatsApp ni SMS; sos vos quien debe consultar el estado actualizado.",
                                "Caso especial: si el pago es aprobado pero al momento del descuento no hay stock "
                                        + "suficiente en la sucursal elegida, el pedido queda en CONFLICTO DE STOCK. "
                                        + "En ese caso, Lembas te contactara para resolver la situacion antes del "
                                        + "vencimiento del plazo de retiro."
                        ),
                        List.of()
                ),
                new TermsSectionDto(
                        "6. Pago",
                        List.of(
                                "Los pagos online se procesan integramente a traves de Mercado Pago, plataforma que "
                                        + "habilita los medios de pago que tu banco o emisor soporte en el momento del "
                                        + "checkout (tarjeta de credito, debito, dinero en cuenta, etc.), siempre en "
                                        + "pesos argentinos (ARS). Lembas no almacena datos de tarjetas ni credenciales "
                                        + "bancarias.",
                                "En la sucursal, las compras presenciales se pagan directamente al empleado en el "
                                        + "momento de la venta, en efectivo, por QR, transferencia bancaria, o con "
                                        + "tarjeta de debito o credito. Toda venta presencial requiere que haya una "
                                        + "caja abierta en la sucursal; el cajero te entregara el comprobante "
                                        + "correspondiente.",
                                "El comprobante que se entrega al consumidor final no constituye factura fiscal "
                                        + "electronica en los terminos del regimen de facturacion electronica de "
                                        + "AFIP/ARCA (Resolucion General 4291/2018 y modif.), que esta fuera del "
                                        + "alcance de este sitio. Si necesitás factura electronica, podes "
                                        + "solicitarla por los canales de la seccion 14 dentro de los 10 dias "
                                        + "corridos posteriores a la compra."
                        ),
                        List.of()
                ),
                new TermsSectionDto(
                        "7. Retiro en sucursal",
                        List.of(
                                "La unica modalidad de entrega habilitada es el retiro en la sucursal elegida al "
                                        + "momento del checkout. No se realizan envios a domicilio. La direccion y "
                                        + "horarios de la sucursal quedan visibles en pantalla y en el detalle del "
                                        + "pedido en la seccion \"Mis pedidos\".",
                                "Para retirar, debes presentarte con tu documento nacional de identidad (DNI). Podes "
                                        + "autorizar a un tercero indicando nombre completo y DNI de esa persona en "
                                        + "el detalle del pedido; la persona autorizada debera presentar su propio "
                                        + "documento al momento del retiro.",
                                "El plazo maximo para retirar el pedido es de 7 dias corridos contados desde la "
                                        + "confirmacion del pago. Vencido ese plazo sin que el pedido haya sido "
                                        + "retirado, Lembas podra cancelarlo de oficio y reintegrar el importe por el "
                                        + "mismo medio de pago."
                        ),
                        List.of()
                ),
                new TermsSectionDto(
                        "8. Derecho de arrepentimiento",
                        List.of(
                                "De conformidad con el articulo 34 de la Ley 24.240 y el articulo 1110 del Codigo "
                                        + "Civil y Comercial de la Nacion, en las ventas celebradas fuera de los "
                                        + "establecimientos comerciales y a distancia el consumidor tiene, en "
                                        + "principio, derecho a revocar la aceptacion dentro de los 10 dias corridos "
                                        + "contados a partir de la fecha en que se entregue el bien o se celebre el "
                                        + "contrato, lo ultimo que ocurra.",
                                "Sin perjuicio de ello, el articulo 1116 del Codigo Civil y Comercial y el articulo 3 "
                                        + "de la Disposicion 954/2025 de la Subsecretaria de Defensa del Consumidor "
                                        + "establecen excepciones al derecho de arrepentimiento. En particular, el "
                                        + "inciso d) de dicho articulo 3 exceptua la adquisicion de productos "
                                        + "perecederos, categoria en la que se encuentran los alimentos, suplementos "
                                        + "dietarios y articulos de dietetica comercializados por Lembas. Por lo "
                                        + "tanto, una vez retirado el pedido de la sucursal no podes ejercer el "
                                        + "derecho de arrepentimiento sobre los productos perecederos recibidos.",
                                "Sin embargo, y mas alla de lo que la legislacion exige, Lembas ofrece "
                                        + "voluntariamente la posibilidad de cancelar cualquier pedido online mientras "
                                        + "este no haya sido retirado, reintegrando el importe por el mismo medio de "
                                        + "pago. La cancelacion se solicita por los canales de la seccion 14 de "
                                        + "este documento. Esta politica comercial es adicional y complementaria a los "
                                        + "derechos que la ley te reconoce y no los limita en ningun caso.",
                                "Para ejercitar cualquier derecho vinculado a la compra, escribinos a "
                                        + CONTACT_EMAIL + " indicando tu nombre, DNI y numero de pedido."
                        ),
                        List.of()
                ),
                new TermsSectionDto(
                        "9. Garantia legal",
                        List.of(
                                "Todos los productos comercializados cuentan con la garantia legal de conformidad "
                                        + "prevista en los articulos 10 a 17 de la Ley 24.240. Ante cualquier "
                                        + "defecto o disconformidad, podes optar entre (a) exigir el cambio del "
                                        + "producto por otro de identicas caracteristicas, (b) obtener una nota de "
                                        + "credito o (c) la devolucion del dinero, en los plazos y condiciones "
                                        + "previstos por la ley.",
                                "Por tratarse de productos alimentarios, la garantia se circunscribe a los defectos "
                                        + "de origen (productos vencidos al momento del retiro, danos, faltantes, "
                                        + "errores en la preparacion) y a las condiciones de conservacion. Para "
                                        + "hacerla efectiva, contactanos dentro de las 24 horas posteriores al retiro "
                                        + "y presenta el comprobante de compra y, de ser posible, el producto o una "
                                        + "muestra del mismo."
                        ),
                        List.of()
                ),
                new TermsSectionDto(
                        "10. Servicio de atencion al consumidor",
                        List.of(
                                "Lembas brinda atencion al consumidor por los canales de la seccion 14 de este "
                                        + "documento (email, telefono y presencial en la sucursal). El horario de "
                                        + "atencion no es inferior a los dias y horarios en que operamos "
                                        + "comercialmente, conforme el articulo 6 de la Disposicion 954/2025."
                        ),
                        List.of()
                ),
                new TermsSectionDto(
                        "11. Privacidad y proteccion de datos personales",
                        List.of(
                                "Los datos personales que nos proporcionas se tratan conforme a la Ley 25.326 de "
                                        + "Proteccion de los Datos Personales y normativa complementaria. El "
                                        + "responsable del tratamiento es " + BUSINESS_NAME + ", con domicilio en "
                                        + BUSINESS_ADDRESS + ".",
                                "Finalidades del tratamiento: gestion de tu cuenta, procesamiento de pedidos, "
                                        + "cumplimiento de obligaciones legales y mejora del servicio. No cedemos tus "
                                        + "datos a terceros con fines de marketing. Solo compartimos informacion con "
                                        + "proveedores necesarios para operar el pago (Mercado Pago) y la preparacion "
                                        + "del pedido.",
                                "Derechos ARCO: en cualquier momento podes ejercer tus derechos de Acceso, "
                                        + "Rectificacion, Cancelacion y Oposicion escribiendo a " + CONTACT_EMAIL
                                        + ". Responderemos tu solicitud dentro de los 10 dias corridos previstos en "
                                        + "el articulo 14 de la Ley 25.326. Ante cualquier disconformidad, podes "
                                        + "recurrir a la Agencia de Acceso a la Informacion Publica (AAIP), autoridad "
                                        + "de aplicacion de la norma."
                        ),
                        List.of()
                ),
                new TermsSectionDto(
                        "12. Propiedad intelectual",
                        List.of(
                                "Las marcas, logos, imagenes, fotografias de productos y contenidos publicados en "
                                        + "el sitio son de propiedad de Lembas o de sus proveedores y estan "
                                        + "protegidos por las normas de propiedad intelectual. Esta prohibida su "
                                        + "reproduccion total o parcial sin autorizacion previa y por escrito."
                        ),
                        List.of()
                ),
                new TermsSectionDto(
                        "13. Limitacion de responsabilidad",
                        List.of(
                                "Lembas no sera responsable por danos derivados del uso indebido del sitio, de la "
                                        + "interrupcion del servicio por causas de fuerza mayor, ni por la "
                                        + "informacion proporcionada por terceros. Ante cualquier duda sobre la "
                                        + "composicion o uso de un producto, consulta con un profesional de la "
                                        + "salud."
                        ),
                        List.of()
                ),
                new TermsSectionDto(
                        "14. Jurisdiccion, ley aplicable y contacto",
                        List.of(
                                "Estas condiciones se rigen por las leyes de la Republica Argentina. Para cualquier "
                                        + "controversia derivada de su interpretacion o aplicacion, las partes se "
                                        + "someten a los " + JURISDICTION + ", sin perjuicio de los derechos del "
                                        + "consumidor previstos en la Ley 24.240 y de la competencia de la autoridad "
                                        + "de aplicacion nacional o provincial en materia de Defensa del Consumidor.",
                                "Para consultas, reclamos, cancelaciones, ejercicios de derechos ARCO o cualquier "
                                        + "otra gestion, contactanos por los siguientes canales."
                        ),
                        List.of(
                                "Email: " + CONTACT_EMAIL,
                                "Telefono: " + CONTACT_PHONE,
                                "Presencial: " + BUSINESS_ADDRESS,
                                "Horario: " + BUSINESS_HOURS
                        )
                )
        );

        return new TermsDto(
                "Terminos y Condiciones",
                LAST_UPDATED,
                "Estos terminos regulan el uso del sitio y la tienda online de "
                        + BUSINESS_NAME + ". Al registrarte y/o comprar en el sitio, aceptas estas condiciones en "
                        + "su totalidad. El texto se encuentra alineado con la legislacion argentina vigente, en "
                        + "particular la Ley 24.240 de Defensa del Consumidor, la Ley 25.326 de Proteccion de los "
                        + "Datos Personales y la Disposicion 954/2025 de la Subsecretaria de Defensa del Consumidor "
                        + "y Lealtad Comercial.",
                sections
        );
    }

    /** Returns the FAQ document with all current entries. */
    public FaqDto getFaq() {
        List<FaqItemDto> items = List.of(
                new FaqItemDto(
                        "como-comprar",
                        "Como hago un pedido?",
                        "Desde el catalogo, agregas los productos al carrito, inicias sesion o te registras, "
                                + "seleccionas la sucursal de retiro y confirmas el pago con Mercado Pago. Cuando el "
                                + "pago queda aprobado, el pedido pasa a PAGADO y se descuenta el stock. A partir de "
                                + "alli queda EN PREPARACION y, cuando esta listo, LISTO PARA RETIRAR.",
                        "Pedidos"
                ),
                new FaqItemDto(
                        "puede-comprar-sin-cuenta",
                        "Puedo comprar sin registrarme?",
                        "No. Para mantener la trazabilidad del retiro y poder contactarte ante cualquier "
                                + "incidencia, todos los pedidos online requieren una cuenta de cliente activa. El "
                                + "registro es gratuito.",
                        "Pedidos"
                ),
                new FaqItemDto(
                        "medios-de-pago-online",
                        "Que medios de pago aceptan online?",
                        "El pago online se procesa integramente con Mercado Pago, por lo que podes pagar con "
                                + "tarjeta de credito, debito, dinero en cuenta, o cualquier otro medio habilitado "
                                + "por la plataforma en el momento del checkout, siempre en pesos argentinos (ARS).",
                        "Pagos"
                ),
                new FaqItemDto(
                        "medios-de-pago-sucursal",
                        "Que medios de pago aceptan en la sucursal?",
                        "En la sucursal podes pagar en efectivo, por QR (Mercado Pago u otros), transferencia "
                                + "bancaria, tarjeta de debito o tarjeta de credito, segun lo que el sistema POS de "
                                + "la caja habilite en el momento. Toda venta presencial requiere una caja abierta.",
                        "Pagos"
                ),
                new FaqItemDto(
                        "cuando-se-descuenta-stock",
                        "Cuando se descuenta el stock?",
                        "El stock se descuenta unicamente cuando el pago queda confirmado. Mientras tu pedido este "
                                + "en PENDIENTE DE PAGO, los productos siguen disponibles para otros clientes y el "
                                + "stock no se reserva.",
                        "Stock"
                ),
                new FaqItemDto(
                        "que-es-fefo",
                        "Que significa FEFO?",
                        "FEFO (First Expired, First Out) es la politica con la que asignamos los lotes: al "
                                + "confirmar el pago, los productos se toman desde los lotes con fecha de vencimiento "
                                + "mas cercana. Esto garantiza que recibas productos con el mayor tiempo de vida "
                                + "util restante. Los lotes sin fecha de vencimiento se consumen despues de los "
                                + "lotes con fecha.",
                        "Stock"
                ),
                new FaqItemDto(
                        "elegir-sucursal",
                        "Puedo elegir la sucursal de retiro?",
                        "Si. En el selector de la parte superior del sitio podes ver las sucursales habilitadas y "
                                + "elegir donde queres retirar. Esta eleccion queda fija al confirmar el checkout y "
                                + "se usa para calcular el stock disponible.",
                        "Retiro"
                ),
                new FaqItemDto(
                        "stock-por-sucursal",
                        "Por que el stock cambia segun la sucursal?",
                        "Cada sucursal administra su propio stock por lotes fisicos. La disponibilidad que "
                                + "mostramos esta calculada para la sucursal de retiro que elegiste. Si en tu "
                                + "sucursal no hay stock, podes cambiar de sucursal desde el selector superior para "
                                + "ver otras opciones.",
                        "Stock"
                ),
                new FaqItemDto(
                        "cuanto-tarda-en-llegar",
                        "Cuando puedo retirar mi pedido?",
                        "Una vez confirmado el pago, el pedido pasa a EN PREPARACION y luego a LISTO PARA "
                                + "RETIRAR. El tiempo de preparacion suele ser de algunas horas, pero puede variar "
                                + "segun la demanda. Podes seguir el estado en cualquier momento desde la seccion "
                                + "\"Mis pedidos\".",
                        "Retiro"
                ),
                new FaqItemDto(
                        "plazo-de-retiro",
                        "Cuanto tiempo tengo para retirar el pedido?",
                        "Tenes 7 dias corridos desde la confirmacion del pago para retirar tu pedido. Vencido "
                                + "ese plazo sin haberlo retirado, Lembas puede cancelarlo de oficio y reintegrar el "
                                + "importe por el mismo medio de pago.",
                        "Retiro"
                ),
                new FaqItemDto(
                        "puede-retirar-otra-persona",
                        "Puede retirar mi pedido otra persona?",
                        "Si. En el detalle del pedido, dentro de \"Mis pedidos\", podes indicar el nombre "
                                + "completo y DNI de la persona autorizada. Esa persona debera presentarse en la "
                                + "sucursal con su propio documento.",
                        "Retiro"
                ),
                new FaqItemDto(
                        "modificar-pedido",
                        "Puedo modificar un pedido ya pagado?",
                        "No. Una vez confirmado el pago, el pedido no se puede modificar. Si necesitas correcciones "
                                + "(cambiar productos, cantidades o sucursal), debes cancelar el pedido (segun las "
                                + "reglas de la seccion 7 de los Terminos) y armar uno nuevo.",
                        "Pedidos"
                ),
                new FaqItemDto(
                        "cancelar-pedido",
                        "Como cancelo un pedido?",
                        "Podes solicitar la cancelacion contactandonos por los canales oficiales mientras el pedido "
                                + "este en PENDIENTE DE PAGO, PAGADO o LISTO PARA RETIRAR, y siempre que no haya "
                                + "sido retirado. Te reintegramos el importe por el mismo medio de pago. Mas alla "
                                + "de lo que la legislacion exige, esta posibilidad de cancelacion se ofrece de "
                                + "forma voluntaria para todos los pedidos no retirados.",
                        "Pedidos"
                ),
                new FaqItemDto(
                        "arrepentimiento",
                        "Tengo derecho de arrepentimiento?",
                        "Los articulos 34 de la Ley 24.240 y 1110 del Codigo Civil y Comercial reconocen el "
                                + "derecho de revocar la compra online en 10 dias corridos. Sin embargo, los "
                                + "alimentos y suplementos dietarios son productos perecederos y estan exceptuados "
                                + "de ese derecho por el articulo 3, inciso d) de la Disposicion 954/2025. Por eso, "
                                + "Lembas ofrece voluntariamente la cancelacion del pedido mientras no haya sido "
                                + "retirado (ver pregunta anterior).",
                        "Pedidos"
                ),
                new FaqItemDto(
                        "que-es-conflicto-stock",
                        "Que pasa si el pago se aprueba pero no hay stock?",
                        "Si al momento de descontar el stock despues de aprobar el pago no hay unidades "
                                + "suficientes en la sucursal, el pedido queda en CONFLICTO DE STOCK. En ese caso, "
                                + "Lembas te contacta para resolver la situacion antes del vencimiento del plazo de "
                                + "retiro. El pago ya esta aprobado y el stock se reserva de forma interna para "
                                + "tu pedido hasta su resolucion.",
                        "Pedidos"
                ),
                new FaqItemDto(
                        "problemas-con-producto",
                        "Que hago si un producto esta en mal estado, vencido o falta algo?",
                        "Contactanos dentro de las 24 horas posteriores al retiro. Para productos vencidos, "
                                + "danados o faltantes, podes optar por el cambio por otro de identicas "
                                + "caracteristicas, una nota de credito o la devolucion del dinero, segun la "
                                + "garantia legal de los articulos 10 a 17 de la Ley 24.240.",
                        "Pedidos"
                ),
                new FaqItemDto(
                        "factura",
                        "Me dan factura?",
                        "No, el comprobante que se entrega al consumidor final no es factura fiscal electronica. "
                                + "El regimen de facturacion electronica de AFIP/ARCA (Resolucion General 4291/2018 "
                                + "y modif.) esta fuera del alcance de este sitio. Si necesitás factura electronica, "
                                + "podes solicitarla por los canales de contacto dentro de los 10 dias corridos "
                                + "posteriores a la compra.",
                        "Pagos"
                ),
                new FaqItemDto(
                        "como-sigo-mi-pedido",
                        "Como me entero del estado de mi pedido?",
                        "Desde la seccion \"Mis pedidos\" de tu cuenta. Lembas no envia notificaciones automaticas "
                                + "por email, WhatsApp ni SMS; sos vos quien debe consultar el estado actualizado.",
                        "Pedidos"
                ),
                new FaqItemDto(
                        "datos-personales",
                        "Que hacen con mis datos personales?",
                        "Los usamos para gestionar tu cuenta, procesar pedidos, cumplir obligaciones legales y "
                                + "mejorar tu experiencia. No compartimos tu informacion con terceros con fines de "
                                + "marketing. Podes ejercer en cualquier momento tus derechos de Acceso, "
                                + "Rectificacion, Cancelacion y Oposicion escribiendo a " + CONTACT_EMAIL + ". "
                                + "Mas informacion en la seccion 11 de los Terminos y Condiciones.",
                        "Cuenta"
                )
        );

        return new FaqDto(
                "Preguntas frecuentes",
                "Las respuestas a las consultas mas comunes sobre pedidos, pagos, retiro en sucursal y cuenta. "
                        + "Si no encontras tu duda aca, contactanos por los canales de la seccion 14 de los "
                        + "Terminos y Condiciones.",
                items
        );
    }
}
