import { Landmark, WalletCards, CreditCard, Smartphone, Phone, ShieldCheck } from "lucide-react";

export const faqItems = [
  {
    category: "Kreditlar",
    icon: Landmark,
    question: "Kredit qarzdorligini bank ofisiga bormasdan to'lash mumkinmi?",
    answer: "Ha. Jismoniy shaxslar MyTuron mobil ilovasi orqali kredit to'lovlarini amalga oshirishi va qarzdorlik holatini monitoring qilib borishi mumkin.",
    tags: ["kredit", "qarzdorlik", "tolov", "myturon", "monitoring"],
  },
  {
    category: "Kreditlar",
    icon: Landmark,
    question: "Necha yoshdan kredit rasmiylashtirish mumkin?",
    answer: "Turonbankda jismoniy shaxslar uchun kreditlar daromadga ega 18 yoshdan 65 yoshgacha bo'lgan O'zbekiston Respublikasi fuqarolariga ajratiladi.",
    tags: ["kredit", "yosh", "18", "65", "daromad"],
  },
  {
    category: "Kreditlar",
    icon: Landmark,
    question: "Onlayn mikroqarz qanday olinadi?",
    answer: "Onlayn mikroqarz Turonbankning MyTuron mobil ilovasi orqali rasmiylashtiriladi. Saytdagi ma'lumotlarga ko'ra bank mijoziga masofadan aylanib, ofisga bormasdan ariza berish mumkin.",
    tags: ["mikroqarz", "onlayn", "myturon", "ariza"],
  },
  {
    category: "Kreditlar",
    icon: Landmark,
    question: "Kredit bo'yicha imtiyozli davr nima?",
    answer: "Imtiyozli davrda mijoz kredit bo'yicha faqat foiz to'lovlarini amalga oshirishi mumkin. Bu muddatda asosiy qarzni so'ndirish majburiyati yuklatilmaydi.",
    tags: ["imtiyozli", "davr", "foiz", "asosiy qarz"],
  },
  {
    category: "Kreditlar",
    icon: Landmark,
    question: "Kredit olish uchun qanday hujjatlar kerak?",
    answer: "Odatda shaxsni tasdiqlovchi hujjat, kredit qaytarilishi ta'minotiga oid hujjatlar va kredit turidan kelib chiqadigan qo'shimcha hujjatlar talab qilinadi.",
    tags: ["hujjat", "pasport", "talab", "kredit"],
  },
  {
    category: "Omonatlar",
    icon: WalletCards,
    question: "Turonbankda omonatni onlayn ochsa bo'ladimi?",
    answer: "Ha. Turonbank milliy va xorijiy valyutadagi omonatlarni taklif qiladi, ayrim onlayn omonatlarni MyTuron mobil ilovasi orqali bank ofisiga kelmasdan ochish mumkin.",
    tags: ["omonat", "onlayn", "myturon", "valyuta"],
  },
  {
    category: "Omonatlar",
    icon: WalletCards,
    question: "Omonatlar kafolatlanganmi?",
    answer: "Turonbank sayti omonatga qo'yilgan mablag'lar xavfsizligi kafolatlanishini va barcha omonatlar davlat tomonidan sug'urtalanganini ko'rsatadi.",
    tags: ["omonat", "kafolat", "sugurta", "davlat"],
  },
  {
    category: "Omonatlar",
    icon: WalletCards,
    question: "Qaysi omonatlar bo'yicha yuqori stavka bor?",
    answer: "Saytda so'mdagi ayrim omonatlar 18% gacha, xorijiy valyutadagi omonatlar 3% gacha ko'rsatilgan. Masalan, Maksimum omonati 18 oy muddatga onlayn ochilishi, to'ldirilishi va qisman chiqim qilinishi mumkin.",
    tags: ["stavka", "foiz", "maksimum", "18", "3"],
  },
  {
    category: "Omonatlar",
    icon: WalletCards,
    question: "Maksimum omonati qanday shartlarda?",
    answer: "Maksimum omonati so'mda, onlayn, 18 oy muddatga va yillik 18% stavka bilan ko'rsatilgan. Omonatni to'ldirish hamda qisman chiqim qilish imkoniyati bor.",
    tags: ["maksimum", "omonat", "18 oy", "18 foiz"],
  },
  {
    category: "Kartalar",
    icon: CreditCard,
    question: "Turonbankda qanday plastik kartalar bor?",
    answer: "Turonbank Humo, Uzcard, Mastercard va Visa kartalarini taklif qiladi. Kartalar orqali milliy va xorijiy valyutada moliyaviy amaliyotlarni bajarish, ayrim kartalarni MyTuron orqali boshqarish mumkin.",
    tags: ["karta", "humo", "uzcard", "visa", "mastercard"],
  },
  {
    category: "Kartalar",
    icon: CreditCard,
    question: "Kartani chiqarish narxi qancha?",
    answer: "Saytda ko'p kartalar uchun chiqarish qiymati 50 000 so'm deb ko'rsatilgan. Visa Business kartasi uchun 100 000 so'm. Xalqaro kartalarda sug'urta depoziti karta turiga qarab farq qiladi.",
    tags: ["karta", "narx", "50000", "100000", "depozit"],
  },
  {
    category: "Kartalar",
    icon: CreditCard,
    question: "HUMO va Uzcard kartalari qancha muddat amal qiladi?",
    answer: "Turonbank saytidagi ma'lumotlarga ko'ra HUMO va Uzcard kartalari 5 yil amal qiladi. Ular milliy valyutada naqd pulsiz to'lovlar va P2P o'tkazmalar uchun qulay.",
    tags: ["humo", "uzcard", "5 yil", "p2p"],
  },
  {
    category: "MyTuron",
    icon: Smartphone,
    question: "MyTuron ilovasi nima uchun kerak?",
    answer: "MyTuron orqali bank xizmatlaridan smartfon orqali foydalanish mumkin: masofadan ro'yxatdan o'tish, onlayn mikroqarz, omonat ochish, kartalarni boshqarish, konversiya va QR orqali to'lov kabi xizmatlar ko'rsatilgan.",
    tags: ["myturon", "ilova", "qr", "konversiya", "mobil"],
  },
  {
    category: "Aloqa",
    icon: Phone,
    question: "Turonbank bilan qanday bog'lanaman?",
    answer: "Yagona telefon-markazi: 1220 yoki +998 71 202-01-01. Ishonch telefoni: +998 71 244-38-76. Call-markaz uzluksiz ishlashi ko'rsatilgan.",
    tags: ["aloqa", "telefon", "1220", "call markaz"],
  },
  {
    category: "Xavfsizlik",
    icon: ShieldCheck,
    question: "Firibgar konkurs va soxta kanallardan qanday ehtiyot bo'laman?",
    answer: "Bank nomidan ochilgan shubhali kanal yoki konkurslarga ishonmang. Rasmiy manbalarni tekshiring, karta yoki shaxsiy ma'lumotlarni begona havolalarda kiritmang va shubhali guruhlar ustidan shikoyat qiling.",
    tags: ["firibgar", "xavfsizlik", "konkurs", "telegram", "karta"],
  },
];

export const quickQuestions = [
  "Qaysi mahallada eng ko'p tadbirkor bor?",
  "Chorsu mahallasi haqida ma'lumot bering",
  "Onlayn mikroqarz qanday olinadi?",
  "Karta chiqarish narxi qancha?",
];

export function getCategories(items) {
  return ["Barchasi", ...new Set(items.map((item) => item.category))];
}

export function scoreItem(item, query) {
  if (!query) return 1;
  const q = query.toLowerCase();
  const inQuestion = item.question.toLowerCase().includes(q);
  const inAnswer = item.answer.toLowerCase().includes(q);
  if (inQuestion) return 2;
  if (inAnswer) return 1;
  return 0;
}
