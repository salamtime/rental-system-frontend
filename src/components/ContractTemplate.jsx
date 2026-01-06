import { forwardRef } from "react";
import { Printer } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const ContractTemplate = forwardRef(({ rental, logoUrl, stampUrl }, ref) => {
  if (!rental) {
    return <div ref={ref}>No rental data available.</div>;
  }

  const {
    id,
    rental_id,
    customer_name,
    customer_email,
    customer_phone,
    customer_license_number,
    nationality,
    start_date,
    end_date,
    vehicle_details,
    signature_url,
    second_driver_name,
    second_driver_license,
    unit_price,
    total_amount,
    overage_charge,
    total_extension_price,
    total_kilometers_driven,
    included_kilometers,
    extra_km_rate_applied,
    total_extended_hours,
    deposit_amount,
    remaining_amount,
    package: rentalPackage,
    total_distance,
    start_odometer,
    ending_odometer,
    original_end_date,
    extensions,
    payment_status,
  } = rental;

  // ✅ Enhanced data extraction with fallback logic for kilometers
  const includedKms = rentalPackage?.included_kilometers || included_kilometers || 100;
  const extraKmRate = rentalPackage?.extra_km_rate || extra_km_rate_applied || 1.5;
  const totalKms = total_kilometers_driven || total_distance || 0;
  const extraKms = Math.max(0, totalKms - includedKms);
  const calculatedOverage = extraKms * extraKmRate;
  
  // Use actual overage_charge from rental if available, otherwise use calculated
  const finalOverageCharge = overage_charge || calculatedOverage;
  
  // Log any discrepancies for debugging
  if (overage_charge && Math.abs(overage_charge - calculatedOverage) > 0.01) {
    console.warn('⚠️ Overage charge mismatch:', {
      stored: overage_charge,
      calculated: calculatedOverage,
      difference: Math.abs(overage_charge - calculatedOverage)
    });
  }

  // ✅ Enhanced data extraction for extensions
  const extensionsList = extensions || [];
  const approvedExtensions = extensionsList.filter(ext => ext.status === 'approved');
  const calculatedHours = approvedExtensions.reduce((sum, ext) => sum + (ext.extension_hours || 0), 0);
  const calculatedPrice = approvedExtensions.reduce((sum, ext) => sum + (ext.extension_price || 0), 0);
  
  // Use calculated values if array exists, otherwise use direct values
  const displayHours = extensionsList.length > 0 ? calculatedHours : (total_extended_hours || 0);
  const displayPrice = extensionsList.length > 0 ? calculatedPrice : (total_extension_price || 0);

  // ✅ NEW: Date formatting helper function
  const formatContractDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getCorrectSignatureUrl = (url) => {
    if (!url) {
      return null;
    }
    if (url.startsWith("http")) {
      return url;
    }
    const supabaseProjectUrl = 'https://nnaymteoxvdnsnhlyvkk.supabase.co';
    const bucketName = 'signatures';
    return `${supabaseProjectUrl}/storage/v1/object/public/${bucketName}/${url}`;
  };

  const finalSignatureUrl = getCorrectSignatureUrl(signature_url);

  const handleDownloadPdf = () => {
    const input = document.getElementById("rental-contract-to-print");
    html2canvas(input, {
      scale: 2,
      useCORS: true,
      scrollY: -window.scrollY,
      windowWidth: input.scrollWidth,
      windowHeight: input.scrollHeight
    }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const ratio = imgWidth / imgHeight;
      
      const width = pdfWidth;
      const height = width / ratio;

      let position = 0;
      let heightLeft = height;

      pdf.addImage(imgData, "PNG", 0, position, width, height);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, width, height);
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`rental-contract-${id}.pdf`);
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-lg print:shadow-none font-sans print:p-0">
      <style>{`
        @media print {
          body { 
            margin: 0 !important; 
            padding: 0 !important; 
            background: white !important;
          }
          
          .no-print { 
            display: none !important; 
          }
          
          #rental-contract-to-print {
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          
          .max-w-3xl {
            max-width: 210mm !important;
            margin: 0 auto !important;
          }
          
          .bg-white {
            background: white !important;
          }
          
          .page-break { 
            page-break-before: always !important;
            margin-top: 20mm !important;
          }
          
          .financial-section { 
            page-break-inside: avoid; 
          }
          
          .signature-section { 
            page-break-inside: avoid; 
          }
          
          button {
            display: none !important;
          }
          
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      `}</style>
      
      <div id="rental-contract-to-print" ref={ref} className="p-3 print:p-4">
        {/* Page 1 */}
        <div>
          {/* Header - Compact */}
          <header className="flex justify-between items-start pb-3 border-b-2 border-gray-800">
            <div className="flex items-center">
              <img src={logoUrl || "/assets/logo.jpg"} alt="Company Logo" className="h-14 w-auto" />
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">SaharaX Rentals</h1>
                <p className="text-[9px] text-gray-600">Ave. Mohammed El Yazidi 43 Sect. 12 Bur. 34-3 Riad Rabat | contact@saharax.co | +212658888852</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-extrabold text-gray-800 uppercase">Rental Agreement</h2>
              <p className="text-xs text-gray-600 mt-1">Agreement #: {rental_id || id.substring(0, 8)}</p>
            </div>
          </header>

          {/* Parties Involved - Compact */}
          <section className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 border-b pb-1 mb-1">Renter Details</h3>
              <div className="text-xs space-y-0.5">
                <p><strong>Name:</strong> {customer_name}</p>
                {customer_email && <p><strong>Email:</strong> {customer_email}</p>}
                <p><strong>Phone:</strong> {customer_phone || "N/A"}</p>
                <p><strong>License:</strong> {customer_license_number || "N/A"}</p>
                {nationality && nationality !== "N/A" && <p><strong>Nationality:</strong> {nationality}</p>}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800 border-b pb-1 mb-1">Vehicle Details</h3>
              <div className="text-xs space-y-0.5">
                <p><strong>Vehicle:</strong> {vehicle_details?.name || rental?.vehicle?.name || "Not specified"}</p>
                {(vehicle_details?.model || rental?.vehicle?.model) && (
                  <p><strong>Model:</strong> {vehicle_details?.model || rental?.vehicle?.model}</p>
                )}
                {(vehicle_details?.plate_number || rental?.vehicle?.plate_number) && (
                  <p><strong>Plate:</strong> {vehicle_details?.plate_number || rental?.vehicle?.plate_number}</p>
                )}
              </div>
              <h3 className="text-sm font-semibold text-gray-800 border-b pb-1 mb-1 mt-2">Rental Period</h3>
              <div className="text-xs space-y-0.5">
                <p><strong>Start:</strong> {formatContractDate(start_date || rental?.rental_start_date)}</p>
                <p><strong>End:</strong> {formatContractDate(end_date || rental?.rental_end_date)}</p>
              </div>
              {/* ✅ NEW: Odometer Section */}
              {(start_odometer || rental?.start_odometer) && (
                <div className="text-xs space-y-0.5 mt-1">
                  <p><strong>Start Odometer:</strong> {start_odometer || rental?.start_odometer} km</p>
                  {(ending_odometer || rental?.ending_odometer) && (
                    <p><strong>Return Odometer:</strong> {ending_odometer || rental?.ending_odometer} km</p>
                  )}
                </div>
              )}
            </div>
          </section>
          
          {/* Second Driver Details - Compact */}
          {second_driver_name && (
            <section className="mt-3">
              <h3 className="text-sm font-semibold text-gray-800 border-b pb-1 mb-1">Second Driver</h3>
              <div className="text-xs space-y-0.5">
                <p><strong>Name:</strong> {second_driver_name}</p>
                <p><strong>License:</strong> {second_driver_license || "N/A"}</p>
              </div>
            </section>
          )}

          {/* Payment Status Section - NO AMOUNTS */}
          <section className="mt-3">
            <div className="p-2 bg-gray-50 border border-gray-200 rounded">
              <h3 className="text-sm font-semibold mb-2">Payment Status</h3>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Base Rental:</span>
                  <span className={payment_status === 'paid' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {payment_status === 'paid' ? '✅ PAID' : '⚠️ UNPAID'}
                  </span>
                </div>
                {extensionsList && extensionsList.length > 0 && (
                  <div className="mt-2">
                    <span className="font-medium">Extensions:</span>
                    {extensionsList.map((ext, idx) => (
                      <div key={idx} className="flex justify-between ml-2">
                        <span>Extension {idx + 1} ({ext.extension_hours}h):</span>
                        <span className={ext.status === 'approved' ? 'text-green-600' : 'text-orange-600'}>
                          {ext.status === 'approved' ? '✅ APPROVED' : '⚠️ PENDING'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Signature Section - Compact */}
          <section className="mt-4 pt-3 border-t-2 border-dashed signature-section">
            <p className="text-[10px] text-center text-gray-600 mb-3">By signing below, the Renter acknowledges and agrees to all terms and conditions.</p>
            <div className="grid grid-cols-2 gap-6 items-end">
              <div>
                <h4 className="font-semibold text-xs text-gray-800 mb-1">Renter's Signature:</h4>
                {finalSignatureUrl ? (
                  <img src={finalSignatureUrl} alt="Customer Signature" className="h-14 w-auto border-b-2 border-gray-400 pb-1" />
                ) : (
                  <div className="h-14 border-b-2 border-gray-400"></div>
                )}
                <p className="text-[10px] mt-1">Date: {new Date().toLocaleDateString('en-US')}</p>
              </div>
              <div className="text-center">
                <img src={stampUrl || "/assets/stamp.png"} alt="Company Stamp" className="h-20 w-auto mx-auto opacity-90" />
                <div className="border-t-2 border-gray-400 mt-1 pt-1">
                  <p className="font-semibold text-xs text-gray-800">SaharaX Rentals Representative</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Page 2: Terms and Conditions - Highly Compact */}
        <div className="page-break">
          <section className="mt-3">
            <h3 className="text-sm font-semibold text-gray-800 border-b pb-1 mb-2">Terms & Conditions</h3>
            <div className="grid grid-cols-2 gap-2 text-[6px] leading-[0.95]">
              {/* French Column */}
              <div className="font-sans">
                <div className="mb-1">
                  <h4 className="font-bold mb-0.5">Art. 1 - Responsabilité</h4>
                  <p>1.1. Le locataire assume l'entière responsabilité de la conduite sûre et légale du quad pendant toute la durée de la location.</p>
                  <p>1.2. La société n'est pas responsable des accidents, blessures ou décès du locataire, des passagers ou de tiers, ni des dommages matériels résultant de l'utilisation du quad.</p>
                  <p>1.3. Le locataire est seul responsable de toute amende, sanction ou conséquence légale résultant d'infractions routières, d'une utilisation inappropriée ou d'une négligence.</p>
                </div>
                <div className="mb-1">
                  <h4 className="font-bold mb-0.5">Art. 2 - Utilisation du Quad</h4>
                  <p>2.1. Le quad ne peut être conduit que par la ou les personnes mentionnées dans le contrat de location.</p>
                  <p>2.2. Il est interdit d'utiliser le quad pour des courses, des sauts, dans des zones interdites, pour remorquer ou pour toute activité dangereuse.</p>
                  <p>2.3. Le locataire doit porter un équipement de sécurité approprié, y compris un casque, en tout temps lors de la conduite.</p>
                  <p>2.4. Il est strictement interdit de conduire sous l'influence de l'alcool, de drogues ou de substances intoxicantes.</p>
                </div>
                <div className="mb-1">
                  <h4 className="font-bold mb-0.5">Art. 3 - État du Véhicule et Dommages</h4>
                  <p>3.1. Le locataire reconnaît l'état du quad tel qu'indiqué dans le schéma d'inspection du véhicule au début de la location.</p>
                  <p>3.2. Toute nouvelle rayure ou dommage au retour sera facturé au locataire au coût de réparation ou de remplacement.</p>
                  <p>3.3. Le locataire est responsable de tous les frais découlant de dommages aux pneus, jantes, rétroviseurs ou accessoires pendant la période de location.</p>
                </div>
                <div className="mb-1">
                  <h4 className="font-bold mb-0.5">Art. 4 - Carburant et Accessoires</h4>
                  <p>4.1. Le locataire doit restituer le quad avec le même niveau de carburant qu'au départ, sous peine de frais de ravitaillement.</p>
                  <p>4.2. Le locataire est entièrement responsable de la conservation de tous les documents du véhicule (carte grise, assurance, documents de location).</p>
                  <p>4.3. Une pénalité de 2000 MAD sera appliquée en cas de perte, de vol ou de détérioration de l'un de ces documents.</p>
                  <p>4.4. Tous les accessoires (casque, clés, outils, équipement de sécurité) doivent être restitués dans le même état qu'à la remise. Tout élément manquant ou endommagé sera facturé au coût de remplacement.</p>
                </div>
                <div className="mb-1">
                  <h4 className="font-bold mb-0.5">Art. 5 - Durée de Location et Retards</h4>
                  <p>5.1. Le quad doit être restitué à l'heure et au lieu convenus dans le contrat.</p>
                  <p>5.2. Les retards entraînent des frais de 100 MAD par heure.</p>
                  <p>5.3. Si le quad est restitué après 12h00 le lendemain, il sera considéré comme une location de 24 heures complètes et facturé en conséquence.</p>
                  <p>5.4. La société se réserve le droit de mettre fin immédiatement à la location en cas de non-respect des présentes conditions.</p>
                </div>
                <div className="mb-1">
                  <h4 className="font-bold mb-0.5">Art. 6 - Paiement et Caution</h4>
                  <p>6.1. Une caution est exigée et sera restituée au retour du quad dans son état initial, déduction faite des frais éventuels pour dommages, carburant manquant ou amendes.</p>
                  <p>6.2. Tous les frais de location et supplémentaires doivent être payés intégralement avant la remise du quad au locataire.</p>
                </div>
                <div>
                  <h4 className="font-bold mb-0.5">Art. 7 - Droit Applicable</h4>
                  <p>7.1. Le présent contrat est régi par les lois du Royaume du Maroc.</p>
                  <p>7.2. Le locataire reconnaît avoir lu et accepté l'ensemble des conditions.</p>
                </div>
              </div>
              {/* Arabic Column */}
              <div className="text-right" dir="rtl">
                <div className="mb-1">
                  <h4 className="font-bold mb-0.5">المادة 1 - المسؤولية</h4>
                  <p>1.1. يتحمل المستأجر المسؤولية الكاملة عن القيادة الآمنة والقانونية للدراجة الرباعية طوال فترة الإيجار.</p>
                  <p>1.2. لا تتحمل الشركة أي مسؤولية عن أي حوادث أو إصابات أو وفاة للمستأجر أو الركاب أو الأطراف الثالثة، أو عن أي أضرار بالممتلكات الناتجة عن استخدام الدراجة الرباعية.</p>
                  <p>1.3. يكون المستأجر مسؤولاً عن أي غرامات أو مخالفات أو عواقب قانونية نتيجة مخالفات المرور أو الاستخدام غير السليم أو الإهمال.</p>
                </div>
                <div className="mb-1">
                  <h4 className="font-bold mb-0.5">المادة 2 - استخدام الدراجة الرباعية</h4>
                  <p>2.1. لا يجوز قيادة الدراجة إلا من قبل الشخص أو الأشخاص المذكورين في عقد الإيجار.</p>
                  <p>2.2. يمنع استخدام الدراجة في السباقات أو القفزات أو المناطق الممنوعة أو الجر أو أي نشاط خطير آخر.</p>
                  <p>2.3. يجب على المستأجر ارتداء معدات السلامة المناسبة، بما في ذلك الخوذة، في جميع الأوقات أثناء القيادة.</p>
                  <p>2.4. يمنع منعاً باتاً القيادة تحت تأثير الكحول أو المخدرات أو أي مواد مخدرة.</p>
                </div>
                <div className="mb-1">
                  <h4 className="font-bold mb-0.5">المادة 3 - حالة المركبة والأضرار</h4>
                  <p>3.1. يقر المستأجر بحالة الدراجة كما هو موضح في مخطط فحص المركبة عند بداية الإيجار.</p>
                  <p>3.2. أي خدوش أو أضرار جديدة عند الإرجاع سيتم تحميل المستأجر تكاليف إصلاحها أو استبدالها.</p>
                  <p>3.3. يتحمل المستأجر جميع التكاليف الناتجة عن تلف الإطارات أو الجنط أو المرايا أو الإكسسوارات خلال فترة الإيجار.</p>
                </div>
                <div className="mb-1">
                  <h4 className="font-bold mb-0.5">المادة 4 - الوقود والإكسسوارات</h4>
                  <p>4.1. يجب على المستأجر إعادة الدراجة بنفس مستوى الوقود كما كانت عند الاستلام، وإلا سيتم فرض رسوم تعبئة.</p>
                  <p>4.2. يتحمل المستأجر المسؤولية الكاملة عن الحفاظ على جميع وثائق المركبة (البطاقة الرمادية، التأمين، أوراق الإيجار).</p>
                  <p>4.3. يتم فرض غرامة 2000 درهم مغربي في حالة فقدان أو سرقة أو إتلاف أي من الوثائق.</p>
                  <p>4.4. يجب إعادة جميع الإكسسوارات (خوذة، مفاتيح، أدوات، معدات السلامة) بنفس الحالة التي تم تسليمها بها، وأي فقدان أو تلف سيتم تحميل المستأجر تكلفة استبداله.</p>
                </div>
                <div className="mb-1">
                  <h4 className="font-bold mb-0.5">المادة 5 - مدة الايجار والرسوم الإضافية</h4>
                  <p>5.1. يجب إعادة الدراجة في الوقت والمكان المتفق عليهما في عقد الإيجار.</p>
                  <p>5.2. يتم فرض رسوم تأخير قدرها 100 درهم مغربي لكل ساعة.</p>
                  <p>5.3. إذا تمت إعادة الدراجة بعد الساعة 12:00 ظهراً من اليوم التالي، فسيتم احتسابها كإيجار لمدة 24 ساعة كاملة ويتوجب دفع تكلفة يوم كامل.</p>
                  <p>5.4. تحتفظ الشركة بحق إنهاء عقد الإيجار فوراً في حال خرق أي بند من هذه الشروط.</p>
                </div>
                <div className="mb-1">
                  <h4 className="font-bold mb-0.5">المادة 6 - الدفع والوديعة</h4>
                  <p>6.1. يتم دفع وديعة تأمين ويتم استرجاعها عند إعادة الدراجة بنفس حالتها الأصلية، مع خصم أي تكاليف للأضرار أو النقص في الوقود أو الغرامات.</p>
                  <p>6.2. يجب دفع جميع رسوم الإيجار وأي رسوم إضافية كاملة قبل تسليم الدراجة إلى المستأجر.</p>
                </div>
                <div>
                  <h4 className="font-bold mb-0.5">المادة 7 - القانون المطبق</h4>
                  <p>7.1. يخضع هذا العقد لقوانين المملكة المغربية.</p>
                  <p>7.2. يقر المستأجر بفهمه الكامل والموافقة على جميع الشروط الواردة هنا.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Footer - Compact */}
          <footer className="mt-4 pt-2 border-t border-gray-200 text-center text-[9px] text-gray-500">
            <p>Thank you for your business. Drive safely!</p>
          </footer>
        </div>
      </div>

      {/* Action Buttons - UPDATED */}
      <div className="mt-6 text-center no-print">
        <div className="flex justify-center gap-3">
          <button 
            onClick={handleDownloadPdf} 
            className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Download as PDF
          </button>
          <button 
            onClick={() => window.print()} 
            className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Printer className="inline-block w-4 h-4 mr-2" />
            Print Contract
          </button>
        </div>
      </div>
    </div>
  );
});

ContractTemplate.displayName = "ContractTemplate";

export default ContractTemplate;