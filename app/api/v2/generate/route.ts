import { NextRequest } from "next/server";
import { openai } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { z } from 'zod';
import { google } from "@ai-sdk/google";

export const maxDuration = 60;
// Define the schema for a single page of the legal document
export const legalDocumentPageSchema = z.object({
    // Document generation status markers
    status: z.object({
        marker: z.enum(["SOS", "MID", "EOS"]).describe("Status marker: Start of Stream (SOS), Middle of Stream (MID), or End of Stream (EOS)"),
        continuationToken: z.string().optional().describe("Token to continue generation if output was truncated"),
        completionStatus: z.number().min(0).max(100).describe("Percentage of completion for current page"),
        isComplete: z.boolean().describe("Whether this page generation is complete"),
        remainingElements: z.array(z.string()).optional().describe("Elements that still need to be generated")
    }).describe("Document generation status and continuation information"),

    // Document metadata (for context)
    metadata: z.object({
        title: z.string().describe("The title of the legal document"),
        documentType: z.string().describe("Type of legal document (e.g., MOU, Agreement, Contract)"),
        reference: z.string().describe("Document reference number"),
        version: z.string().describe("Document version number"),
        date: z.string().describe("Date of document creation"),
        language: z.string().default("Indonesian").describe("Primary language of the document"),
        jurisdiction: z.string().default("Indonesia").describe("Legal jurisdiction governing the document"),
        confidentialityLevel: z.string().default("Confidential").describe("Level of confidentiality")
    }).describe("Document metadata and control information"),

    // Parties information (for context) - SIMPLIFIED TO MINIMAL
    parties: z.array(z.object({
        name: z.string().describe("Name of individual or representative"),
        organization: z.string().optional().describe("Name of organization (if applicable)"),
        position: z.string().optional().describe("Position or title of the person (if applicable)"),
        address: z.string().describe("Complete address")
    })).describe("The parties involved in the agreement"),

    // Current page information
    currentPage: z.object({
        pageType: z.enum([
            "cover",
            "pembukaan", // Indonesian preamble section
            "isi", // Main content
            "penutup", // Closing section
            "signature",
            "lampiran" // Attachments
        ]).describe("Type of page according to Indonesian document conventions"),
        header: z.string().describe("Page header text"),
        footer: z.string().describe("Page footer text including page numbers"),

        // Content elements on the page
        elements: z.array(z.object({
            type: z.enum([
                "judul", // Document title
                "pembukaan", // Preamble
                "konsideran", // Considerations (Menimbang)
                "dasar_hukum", // Legal basis (Mengingat)
                "pasal", // Article
                "ayat", // Paragraph within article
                "butir", // Point within paragraph
                "daftar", // List
                "tabel", // Table
                "blok_tanda_tangan", // Signature block
                "referensi_lampiran" // Reference to attachment
            ]).describe("Type of content element in Indonesian document format"),

            // Element identification and numbering
            id: z.string().describe("Element identifier (e.g., 'Pasal 3', 'Ayat 2.1')"),
            number: z.string().describe("Element number or reference"),

            // Element content
            title: z.string().optional().describe("Title or heading of the element"),
            content: z.string().describe("Content text with markdown formatting"),

            // For lists and clauses
            items: z.array(z.object({
                number: z.string().describe("Item number or reference (e.g., '1.', 'a.', 'i.')"),
                content: z.string().describe("Item content text")
            })).optional().describe("List items or clauses"),

            // For signature blocks
            signatureInfo: z.object({
                partyIndex: z.number().describe("Reference to party index who signs"),
                title: z.string().describe("Title for signature block (e.g., 'PIHAK PERTAMA')"),
                name: z.string().describe("Name to appear under signature line"),
                position: z.string().describe("Position to appear under name"),
                place: z.string().describe("Place of signing (e.g., 'Jakarta')"),
                date: z.string().describe("Date of signing in Indonesian format (e.g., '5 Juni 2024')"),
                stampDuty: z.boolean().describe("Whether to include stamp duty (materai) indication"),
                stampDutyValue: z.string().describe("Value of the stamp duty (e.g., 'Rp10.000')")
            }).optional().describe("Signature block information with Indonesian formalities"),
        })).describe("Content elements on the page")
    }).describe("The current page being generated"),

    // Navigation context
    navigation: z.object({
        currentDocumentSummary: z.string().describe("Brief summary of the current document"),
        previousPageSummary: z.string().describe("Brief summary of previous page content"),
        nextPageHint: z.string().describe("Hint for what should be on the next page"),
        continuationElement: z.string().describe("ID of element that continues from previous page"),
        isLastPage: z.boolean().describe("Indicates if this is the final page")
    }).describe("Navigation and context information for iterative generation"),

    // Document formalities
    formalities: z.object({
        tempatPenandatanganan: z.string().optional().describe("Tempat dokumen ditandatangani"),
        tanggalPenandatanganan: z.string().optional().describe("Tanggal dokumen ditandatangani"),
        materai: z.boolean().default(true).describe("Penggunaan materai pada dokumen"),
        nilaiMaterai: z.string().default("Rp10.000").describe("Nilai materai yang digunakan"),
        saksi: z.array(z.object({
            nama: z.string().describe("Nama saksi"),
            jabatan: z.string().optional().describe("Jabatan saksi")
        })).optional().describe("Daftar saksi jika diperlukan")
    }).describe("Formalitas dokumen sesuai ketentuan Indonesia"),
});

export async function POST(req: NextRequest) {
    try {
        const { promptText, previousState } = await req.json();

        // Extract data from prompt for initial generation
        // Structured state management for document generation
        const initialState = createInitialState(previousState, promptText);

        // Generate the appropriate prompt context based on generation stage
        const promptContext = generatePromptContext(previousState, promptText, initialState);

        const res = await streamObject({
            // model: openai("gpt-4o-flas"),
            model: google("gemini-2.5-flash-preview-04-17"),
            schema: legalDocumentPageSchema,
            system: createSystemPrompt(),
            prompt: promptContext,
            temperature: 0.5,
            schemaDescription: "Generate a legal document in Indonesian language with rich markdown formatting and structured numbered lists.",
        });

        const response = res.toTextStreamResponse();
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
        response.headers.set('Access-Control-Max-Age', '86400');
        return response;

    } catch (error) {
        console.error("Error in /api/new-generate:", error);
        return new Response(JSON.stringify({ error: "Error generating legal document" }), {
            status: 500,
            headers: {
                "Content-Type": "application/json",
                'Access-Control-Allow-Origin': '*',
            }
        });
    }
}

/**
 * Creates the initial state for document generation
 */
function createInitialState(previousState: any, promptText: any) {
    if (previousState) return previousState;

    return {
        status: {
            marker: "SOS",
            completionStatus: 0,
            isComplete: false,
            remainingElements: ["pembukaan", "isi_kontrak", "penutup"]
        },
        promptText,
        currentPage: {
            pageType: "cover",
            elements: []
        },
        navigation: {
            currentDocumentSummary: "",
            previousPageSummary: "",
            nextPageHint: "Pembukaan dokumen dengan identifikasi para pihak",
            isLastPage: false
        },
        formalities: {
            tempatPenandatanganan: "Jakarta",
            tanggalPenandatanganan: formatIndonesianDate(new Date()),
            materai: true,
            nilaiMaterai: "Rp10.000"
        }
    };
}

/**
 * Generates the appropriate prompt context based on generation stage
 */
function generatePromptContext(previousState: any, promptText: any, initialState: any) {
    // Base context always included
    const baseContext = `
    [KONTEKS DASAR]
    ${promptText}
    
    [STATUS DOKUMEN]
    ${JSON.stringify(initialState, null, 2)}
    `;

    // Generate continuation context if this is not the first generation
    const continuationContext = previousState ? `
    [INFORMASI LANJUTAN]
    Status sebelumnya: ${previousState.status?.marker || "undefined"}
    Penyelesaian: ${previousState.status?.completionStatus || 0}%
    Tipe halaman terakhir: ${previousState.currentPage?.pageType || "undefined"}
    
    Ringkasan halaman sebelumnya: 
    ${previousState.navigation?.previousPageSummary || "Belum ada halaman sebelumnya."}
    
    ${previousState.status?.marker === "MID" ?
            "Lanjutkan pembuatan dokumen dari posisi ini. Selesaikan elemen yang belum lengkap." :
            "Buat halaman berikutnya sesuai dengan alur dokumen."}
    ` : "";

    // Determine if we're starting fresh or continuing
    if (!previousState) {
        return `
        ${baseContext}
        
        [INSTRUKSI PEMBUATAN DOKUMEN]
        Buatlah dokumen hukum Indonesia yang komprehensif, lengkap dan profesional berdasarkan informasi yang diberikan. Dokumen harus memiliki format markdown yang rapi dengan paragraf-paragraf yang detil dan substantif.
        
        Dalam pembuatan dokumen:
        - Gunakan paragraf yang cukup panjang namun jelas dan mudah dipahami
        - Sertakan terminologi hukum yang tepat dan bahasa formal yang kaya
        - Gunakan struktur kalimat yang bervariasi dan elegan
        - Berikan elaborasi yang memadai untuk setiap gagasan penting
        - Pastikan dokumen memiliki fleksibilitas untuk diterapkan dalam berbagai konteks bisnis
        
        ${getDocumentStructureGuidance()}
        
        [PENTING UNTUK DIPERHATIKAN]
        1. Gunakan status marker "SOS" untuk halaman pertama.
        2. Gunakan status marker "MID" untuk halaman tengah.
        3. Gunakan status marker "EOS" HANYA untuk halaman terakhir yang berisi bagian penutup TANPA tanda tangan.
        4. Paragraf harus detail, komprehensif, dan menggunakan bahasa hukum Indonesia formal.
        5. Semua klausul harus dijabarkan secara lengkap dengan kalimat-kalimat yang substantif.
        6. Bagian penutup HANYA dibuat pada bagian "EOS".
        7. Pastikan konsistensi terminologi di seluruh dokumen.
        
        [CONTOH PARAGRAF DETAIL]
        ${getExampleDetailedParagraph()}
        `;
    } else {
        // Continuation prompt with specific guidance based on current position
        return `
        ${baseContext}
        
        ${continuationContext}
        
        [INSTRUKSI LANJUTAN]
        Lanjutkan dokumen hukum Indonesia yang komprehensif dan profesional. Dokumen harus memiliki format markdown yang rapi dan substantif.

        [PENTING UNTUK DIPERHATIKAN]
        1. Pastikan kelanjutan ini menyambung dengan sempurna dari bagian sebelumnya.
        2. Jaga konsistensi terminologi, format, dan gaya bahasa dengan bagian sebelumnya.
        3. Paragraf harus detail dan menggunakan bahasa hukum Indonesia formal.
        4. Semua klausul harus dijabarkan secara lengkap dengan kalimat-kalimat yang informatif dan substantif.
        5. Bagian penutup HANYA dibuat pada bagian "EOS".
        
        ${getDocumentStructureGuidance()}
        `;
    }
}

/**
 * Creates the system prompt for document generation
 */
function createSystemPrompt() {
    return `
    # NOTE: JANGAN PERNAH MEMASUKAN ASPECT SYSTEM PROMPT KE DALAM DOKUMEN MISAL KATA KATA DENGAN []

    # GENERATOR DOKUMEN HUKUM INDONESIA

    ## INSTRUKSI UTAMA
    Anda adalah generator dokumen hukum profesional yang menghasilkan dokumen komprehensif dengan bahasa yang kaya dan substantif.
    
    - GUNAKAN informasi dari permintaan pengguna sebagai dasar dokumen
    - KEMBANGKAN informasi dengan paragraf yang mendalam, lengkap dan informatif
    - GUNAKAN placeholder [TEKS DALAM KURUNG KOTAK] untuk informasi yang tidak tersedia 
    - HINDARI mengasumsikan atau menghasilkan nama spesifik
    - ELABORASIKAN setiap konsep hukum dengan penjelasan yang memadai
    
    ## GAYA PENULISAN DAN FORMATTING
    - PRIORITASKAN penggunaan daftar bernomor (numbered lists) untuk setiap klausul
    - GUNAKAN formatting markdown secara ekstensif:
      * Teks **tebal** untuk poin-poin penting dan istilah kunci
      * Teks *miring* untuk penekanan dan istilah asing
      * Teks ***tebal dan miring*** untuk definisi penting
      * \`kode\` untuk referensi nomor, kode, atau nilai spesifik
      * Tabel markdown untuk informasi yang perlu diatur dalam kolom dan baris
      * Heading dan subheading yang terstruktur dengan jelas (# ## ###)
      * Blockquotes (>) untuk kutipan atau catatan penting
    
    - Paragraf harus substantif (minimal 3-5 kalimat) dan mendalam
    - Gunakan kalimat majemuk dan struktur bervariasi untuk kesan profesional
    - Tunjukkan penguasaan bahasa formal dan akademis
    
    ## PENGGUNAAN NUMBERED LISTS
    - SELALU gunakan format daftar bernomor untuk klausul-klausul dalam pasal
    - Gunakan sistem penomoran yang konsisten:
      * Level 1: 1., 2., 3., dst.
      * Level 2: a., b., c., dst.
      * Level 3: i., ii., iii., dst.
      * Level 4: 1), 2), 3), dst.
      * Level 5: a), b), c), dst.
    - Setiap list harus diawali dengan "-" untuk membuat list markdown yang valid
    
    ## PENGGUNAAN TABEL
    - Gunakan tabel untuk menyajikan:
      * Perbandingan hak dan kewajiban
      * Jadwal pembayaran atau pelaksanaan
      * Daftar deliverables atau output
      * Metrik atau parameter pengukuran
    
    ## MARKER STATUS
    Setiap respons harus menyertakan marker status yang tepat:
    - "SOS" (Start of Stream): Untuk memulai pembuatan dokumen
    - "MID" (Middle of Stream): Untuk halaman di tengah dokumen
    - "EOS" (End of Stream): HANYA untuk halaman terakhir yang berisi bagian penutup
    
    ## TUJUAN DOKUMEN
    Menghasilkan dokumen hukum Indonesia yang:
    1. Mengikuti standar hukum Indonesia dengan kedalaman analisis yang memadai
    2. Menggunakan bahasa hukum Indonesia formal yang kaya dan bervariasi
    3. Memiliki struktur yang logis dan koheren dengan transisi yang halus antar bagian
    4. Menggunakan format markdown yang optimal untuk keterbacaan dan daya tarik visual
    5. Cukup fleksibel untuk diterapkan dalam berbagai konteks bisnis
    
    ## BATASAN PENTING
    1. DILARANG membuat bagian tanda tangan
    2. Setiap pasal WAJIB diikuti dengan minimal satu paragraf pengantar yang informatif dan substantif
    3. Gunakan terminologi hukum Indonesia yang tepat dan kaya
    `;
}

/**
 * Provides example of a detailed paragraph for reference
 */
function getExampleDetailedParagraph() {
    return `
    INI HANYA CONTOH PARAGRAF DETAIL JANGAN DIGUNAKAN DALAM DOKUMEN
    BUATLAH SESUAI PARAGRAF YANG RELEVAN DENGAN KONTEN DOKUMEN

    ### PASAL 3
    **RUANG LINGKUP KERJA SAMA**
    
    Ruang lingkup kerja sama dalam Perjanjian ini mencakup serangkaian aktivitas, program, dan inisiatif yang telah disetujui oleh Para Pihak, yang secara kolektif didesain untuk mencapai tujuan bersama sebagaimana diuraikan dalam Pasal 2 Perjanjian ini. Ruang lingkup ini dimaksudkan untuk memberikan kerangka operasional yang jelas dan terukur bagi implementasi kerja sama, dengan tetap memberikan fleksibilitas yang memadai untuk mengakomodasi perkembangan dan perubahan kebutuhan Para Pihak selama berlangsungnya Perjanjian. Dengan mempertimbangkan kapasitas, sumber daya, dan kompetensi inti masing-masing Pihak, Para Pihak menetapkan ruang lingkup kerja sama sebagai berikut:
    
    1. **Komponen Utama Kerja Sama**
       
       Para Pihak sepakat bahwa ruang lingkup kerja sama dalam Perjanjian ini mencakup namun tidak terbatas pada aktivitas-aktivitas sebagai berikut:
       
       a. ***Pengembangan dan Implementasi Sistem***
          
          Pengembangan dan implementasi [aspek kerja sama pertama] yang meliputi:
          
          i. Perancangan arsitektur sistem yang *scalable* dan *robust*;
          ii. Pengembangan modul-modul fungsional sesuai dengan **kebutuhan pengguna**;
          iii. Implementasi sistem dengan memperhatikan aspek *security* dan *performance*;
          iv. Pengujian menyeluruh untuk memastikan kualitas dan reliabilitas sistem.
       
       b. ***Manajemen Proyek dan Pendampingan***
          
          Perancangan, pelaksanaan, dan evaluasi [aspek kerja sama kedua] melalui:
          
          i. Penyusunan *project charter* dan rencana kerja terperinci;
          ii. Pelaksanaan aktivitas sesuai dengan metodologi **manajemen proyek** yang disepakati;
          iii. Monitoring dan evaluasi berkala terhadap pencapaian *milestone* proyek;
          iv. Pendampingan teknis dan non-teknis selama masa transisi dan implementasi.
       
       c. ***Transfer Pengetahuan dan Peningkatan Kapasitas***
          
          Koordinasi dan sinkronisasi [aspek kerja sama ketiga] yang terdiri dari:
          
          i. Pelaksanaan program pelatihan komprehensif untuk **pengguna akhir**;
          ii. Penyusunan dan distribusi dokumentasi teknis dan manual pengguna;
          iii. Pendampingan pasca-implementasi untuk memastikan keberlanjutan sistem.
    
    2. **Perjanjian Pelaksanaan**
       
       Pelaksanaan kerja sama sebagaimana dimaksud pada butir 1 akan dijabarkan secara lebih terperinci dalam bentuk Perjanjian Pelaksanaan yang sekurang-kurangnya memuat:

       | **Aspek** | **Deskripsi** | **Penanggung Jawab** |
       |-----------|---------------|----------------------|
       | **Tujuan** | Deskripsi mendetail tentang tujuan spesifik, indikator capaian, dan parameter keberhasilan | *PIHAK PERTAMA & KEDUA* |
       | **Ruang Lingkup** | Batasan, asumsi, dan prasyarat pekerjaan | *PIHAK PERTAMA* |
       | **Jadwal** | Tonggak pencapaian (*milestones*) dan tenggat waktu | *PIHAK KEDUA* |
       | **Spesifikasi Teknis** | Persyaratan fungsional dan non-fungsional | *PIHAK KEDUA* |
       | **Sumber Daya** | Alokasi SDM, finansial, dan teknis | *PIHAK PERTAMA & KEDUA* |
       | **Monitoring** | Prosedur dan instrumen evaluasi | *PIHAK PERTAMA* |
       | **Hak & Kewajiban** | Rincian hak dan kewajiban spesifik | *PIHAK PERTAMA & KEDUA* |
    
    3. **Hierarki Dokumen**
       
       Dalam hal terdapat ketidaksesuaian antara ketentuan dalam Perjanjian ini dengan Perjanjian Pelaksanaan, maka ketentuan dalam Perjanjian ini yang akan berlaku (*prevail*), kecuali ditentukan lain secara tegas dan tertulis oleh Para Pihak.

    > **Catatan Penting**: Setiap perubahan terhadap ruang lingkup kerja sama harus didokumentasikan secara tertulis dan disetujui oleh Para Pihak melalui mekanisme *change request* yang ditetapkan dalam Perjanjian Pelaksanaan.
    `;
}

/**
 * Provides guidance on document structure based on extracted data
 */
function getDocumentStructureGuidance() {
    return `
    INI HANYA CONTOH STRUKTUR DOKUMEN
    BUATLAH SESUAI STRUKTUR YANG RELEVAN DENGAN KONTEN DOKUMEN

    # STRUKTUR DOKUMEN YANG DIHARAPKAN
    
    Berikut adalah struktur dokumen yang harus dibuat dengan format markdown, menggunakan paragraf yang komprehensif, daftar bernomor, dan elemen visual yang menarik:
    
    ## 1. HALAMAN SAMPUL
    
    Halaman sampul harus disusun dengan format markdown yang rapi:
    
    \`\`\`markdown
    # [JUDUL DOKUMEN]
    
    **${formatIndonesianDate(new Date())}**
    \`\`\`
    
    ## 2. PEMBUKAAN (KOMPARISI)
    
    Pembukaan wajib memiliki paragraf pengantar sebelum identifikasi para pihak:
    
    \`\`\`markdown
    Perjanjian [Jenis Perjanjian] ini ("**Perjanjian**") dibuat dan ditandatangani pada hari ini, **${formatIndonesianDay(new Date())}**, tanggal *${formatIndonesianDateWithWords(new Date())}*, oleh dan antara:
    
    1. **[NAMA]**, [jabatan], yang dalam hal ini bertindak untuk dan atas nama **[nama organisasi]**, berkedudukan di [alamat lengkap], selanjutnya disebut sebagai "**PIHAK PERTAMA**";
    
    2. **[NAMA]**, [jabatan], yang dalam hal ini bertindak untuk dan atas nama **[nama organisasi]**, berkedudukan di [alamat lengkap], selanjutnya disebut sebagai "**PIHAK KEDUA**";
    
    PIHAK PERTAMA dan PIHAK KEDUA, selanjutnya secara bersama-sama disebut sebagai "**Para Pihak**" dan masing-masing sebagai "**Pihak**".
    \`\`\`
    
    ## 3. RECITAL (KONSIDERAN)
    
    Recital harus menggunakan daftar bernomor dengan formatting markdown yang jelas:
    
    \`\`\`markdown
    ### MENIMBANG:
    
    Bahwa Para Pihak telah melakukan serangkaian diskusi terkait rencana kerja sama, dan memandang perlu untuk menuangkan kesepakatan tersebut dalam bentuk tertulis yang mengikat secara hukum. Para Pihak terlebih dahulu menerangkan sebagai berikut:

    1. Bahwa **PIHAK PERTAMA** adalah [deskripsi kegiatan usaha PIHAK PERTAMA];

    2. Bahwa **PIHAK KEDUA** adalah [deskripsi kegiatan usaha PIHAK KEDUA];

    3. Bahwa **PIHAK PERTAMA** membutuhkan [kebutuhan PIHAK PERTAMA];

    4. Bahwa **PIHAK KEDUA** memiliki kemampuan untuk [kapasitas PIHAK KEDUA];

    5. Bahwa berdasarkan hal-hal tersebut di atas, Para Pihak sepakat untuk mengadakan Perjanjian ini dengan syarat-syarat dan ketentuan-ketentuan sebagai berikut.
    
    ### MENGINGAT:

    1. Undang-Undang Nomor 40 Tahun 2007 tentang Perseroan Terbatas;
    2. Kitab Undang-Undang Hukum Perdata (Burgerlijk Wetboek), khususnya tentang Perikatan;
    3. [Dasar hukum lain yang relevan dengan konteks perjanjian];
    \`\`\`

    # PASTIKAN HAK DAN KEWAJIBAN PARA PIHAK DITULIS SEBAGAI PAGE DAN SEGMEN TERSENDIRI Seperti cover, pembukaan, isi, penutup
    MESKI TIDAK ADA DI PROMPT TAPI TETAP HARUS ADA DI DOKUMEN, SILAHKAN DITAMBAHKAN KE HAK DAN KEWAJIBAN (TAMBAHKAN HAK DAN KEWAJIBAN YANG BIASANYA ADA DI PERJANJIAN SEPERTI INI)
    
    ## HAK DAN KEWAJIBAN PIHAK PERTAMA
    PIHAK PERTAMA sebagai [role dalam perjanjian misal sebagai penyedia dana dsb] memiliki hak dan kewajiban sebagai berikut:
    \`\`\`markdown
    1. **PIHAK PERTAMA BERHAK** [hak PIHAK PERTAMA];
    2. **PIHAK PERTAMA WAJIB** [kewajiban PIHAK PERTAMA];
    ...

    ## HAK DAN KEWAJIBAN PIHAK KEDUA
    PIHAK KEDUA sebagai [role dalam perjanjian misal sebagai penyedia dana dsb] memiliki hak dan kewajiban sebagai berikut:
    1. **PIHAK KEDUA BERHAK** [hak PIHAK KEDUA];
    2. **PIHAK KEDUA WAJIB** [kewajiban PIHAK KEDUA];
    ...

    ## HAK DAN KEWAJIBAN PIHAK LAIN... (KETIGA, KEEMPAT, DLL)
    ...


    
    ## 4. PASAL-PASAL UTAMA
    
    Setiap pasal harus diawali dengan judul pasal yang jelas, menggunakan formatting markdown dan daftar bernomor:
    
    \`\`\`markdown
    ### PASAL 1
    **DEFINISI DAN INTERPRETASI**

    Untuk memastikan keseragaman pemahaman dan menghindari perbedaan interpretasi, Para Pihak menyepakati definisi berikut yang berlaku dalam Perjanjian ini:
    
    1. "**Perjanjian**" berarti perjanjian ini beserta segala perubahan, penambahan, dan lampiran yang merupakan bagian tidak terpisahkan.
    
    2. "**Jangka Waktu**" berarti periode berlakunya Perjanjian ini sebagaimana diatur dalam Pasal [X], termasuk setiap perpanjangan yang disepakati secara tertulis.
    
    3. "***Force Majeure***" berarti peristiwa atau keadaan di luar kendali wajar Para Pihak yang secara langsung mempengaruhi pelaksanaan kewajiban berdasarkan Perjanjian ini.
    
    > *Definisi di atas berlaku baik untuk bentuk tunggal maupun jamak dari istilah yang didefinisikan.*
    
    ### PASAL 2
    **MAKSUD DAN TUJUAN**
    
    Perjanjian ini dibuat dan ditandatangani dengan maksud untuk menetapkan kerangka kerja sama yang komprehensif antara Para Pihak dalam rangka [maksud perjanjian]. Adapun tujuan dari Perjanjian ini adalah:
    
    1. Memformalkan hubungan kerja sama antara Para Pihak;
    
    2. Mengatur hak dan kewajiban masing-masing Pihak;
    
    3. Menciptakan landasan bagi tercapainya [tujuan perjanjian];
    
    4. Menetapkan mekanisme penyelesaian perselisihan yang mungkin timbul.
    \`\`\`

    
    Tabel dapat digunakan untuk menyajikan informasi secara terstruktur:
    
    \`\`\`markdown
    ### PASAL X
    **JADWAL PELAKSANAAN**
    
    Para Pihak menyepakati jadwal pelaksanaan kerja sama sebagai berikut:
    
    | **Tahapan** | **Waktu Pelaksanaan** | **Penanggung Jawab** | **Output** |
    |-------------|-------------------|-------------------|-----------|
    | **Persiapan** | [Tanggal Mulai] - [Tanggal Selesai] | PIHAK PERTAMA | [Output Tahap Persiapan] |
    | **Pelaksanaan** | [Tanggal Mulai] - [Tanggal Selesai] | PIHAK KEDUA | [Output Tahap Pelaksanaan] |
    | **Evaluasi** | [Tanggal Mulai] - [Tanggal Selesai] | PARA PIHAK | [Output Tahap Evaluasi] |
    
    > **Catatan**: Jadwal di atas dapat disesuaikan berdasarkan kesepakatan tertulis Para Pihak.
    \`\`\`
    
    ## 6. PENUTUP (HANYA PADA HALAMAN "EOS")
    
    Bagian penutup pada halaman "EOS" harus berupa kalimat penutup formal yang komprehensif:
    
    \`\`\`markdown
    ### PENUTUP
    
    Demikianlah Perjanjian ini dibuat dan ditandatangani oleh Para Pihak dalam rangkap 2 (dua) asli, masing-masing bermeterai cukup dengan nilai \`Rp10.000\` (sepuluh ribu Rupiah) sesuai dengan ketentuan peraturan perundang-undangan yang berlaku di bidang bea meterai, dan masing-masing rangkap memiliki kekuatan hukum yang sama. 

    Para Pihak menyatakan telah:
    
    1. Membaca dan memahami seluruh isi Perjanjian ini;
    2. Menyetujui seluruh ketentuan dan persyaratan dalam Perjanjian ini;
    3. Menandatangani Perjanjian ini tanpa adanya paksaan atau tekanan;
    4. Berkomitmen untuk melaksanakan seluruh ketentuan dengan itikad baik.
    
    Perjanjian ini berlaku efektif sejak tanggal penandatanganan sebagaimana disebutkan pada bagian awal Perjanjian ini.

    ---
    
    ***Untuk dan atas nama Para Pihak***
    \`\`\`
    
    **PENTING: JANGAN membuat bagian tanda tangan atau blok tanda tangan karena akan ditangani oleh sistem terpisah.**

    
    **Catatan**: Pastikan untuk menyertakan semua elemen penting dalam dokumen, termasuk definisi, hak dan kewajiban, serta mekanisme penyelesaian sengketa.

    Jika suatu segment tidak ada informasinya, jangan dihasilkan. Jangan membuat paragraf yang menggantung seperti

    "Jika ada hal lain yang perlu ditambahkan, silakan tambahkan di sini." atau "Jika ada informasi tambahan, silakan tambahkan di sini."
    atau
    "...sebagai berikut: [TIDAK ADA INFORMASI TAMBAHAN YANG DITAMBAHKAN]"
    `;
}

// Helper function to format date with day name in Indonesian
function formatIndonesianDay(date: Date): string {
    const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
    // Convert from JS day (0 = Sunday) to Indonesian day (0 = Monday)
    const dayIndex = (date.getDay() + 6) % 7;
    return days[dayIndex];
}

// Helper function to format date with words in Indonesian
function formatIndonesianDateWithWords(date: Date): string {
    const day = date.getDate();
    const month = getIndonesianMonth(date.getMonth());
    const year = date.getFullYear();

    // Convert numbers to words for the day
    const dayInWords = numberToIndonesianWords(day);

    return `${dayInWords} bulan ${month} tahun ${numberToIndonesianWords(year)}`;
}

// Helper function to convert numbers to Indonesian words
function numberToIndonesianWords(num: number): string {
    if (num <= 0) return "nol";

    const units = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh",
        "sebelas", "dua belas", "tiga belas", "empat belas", "lima belas", "enam belas",
        "tujuh belas", "delapan belas", "sembilan belas"];

    const tens = ["", "", "dua puluh", "tiga puluh", "empat puluh", "lima puluh",
        "enam puluh", "tujuh puluh", "delapan puluh", "sembilan puluh"];

    if (num < 20) return units[num];

    if (num < 100) {
        return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + units[num % 10] : "");
    }

    if (num < 200) {
        return "seratus" + (num % 100 !== 0 ? " " + numberToIndonesianWords(num % 100) : "");
    }

    if (num < 1000) {
        return units[Math.floor(num / 100)] + " ratus" + (num % 100 !== 0 ? " " + numberToIndonesianWords(num % 100) : "");
    }

    if (num < 2000) {
        return "seribu" + (num % 1000 !== 0 ? " " + numberToIndonesianWords(num % 1000) : "");
    }

    if (num < 1000000) {
        return numberToIndonesianWords(Math.floor(num / 1000)) + " ribu" +
            (num % 1000 !== 0 ? " " + numberToIndonesianWords(num % 1000) : "");
    }

    return num.toString(); // Fallback for larger numbers
}

// Helper function to format date in Indonesian format
function formatIndonesianDate(date: Date): string {
    const day = date.getDate();
    const month = getIndonesianMonth(date.getMonth());
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
}

// Helper function for Indonesian month names
function getIndonesianMonth(monthIndex: number): string {
    const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return months[monthIndex];
}

