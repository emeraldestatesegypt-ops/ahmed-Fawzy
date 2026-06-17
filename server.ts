import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize GoogleGenAI exactly as requested by the user
export const ai = new GoogleGenAI({
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, 
  location: "us-central1" 
} as any);

// API routes first
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/gemini/generate-copy", async (req, res) => {
  try {
    const { property, price, clientName } = req.body;
    
    const prompt = `Write a highly conversion-optimized short greeting or promotional WhatsApp copy.
Client Name: ${clientName || 'valued client'}
Property/Compound context: ${property || 'premium options'}
Pricing/Installments context: ${price || 'flexible terms'}
Sales Contact: Ahmed Fawzy from Sierra Estates

Keep the tone professional, persuasive, and warm. Use emojis and some bolding with *asterisks* (e.g. *exclusive deal*) to make it perfect for WhatsApp. Limit to 3 sentences.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini generate-copy error:", error);
    res.status(500).json({ error: error.message || "Failed to generate copywriting" });
  }
});

app.post("/api/gemini/excel", async (req, res) => {
  try {
    const { mode, prompt, spreadsheetData } = req.body;
    
    if (mode === "generate") {
      const systemInstruction = `You are an expert real estate data generator and spreadsheet builder for Egyptian compounds.
Your job is to generate tabular data in JSON format based on the user's requesting prompt.
Output MUST be a valid JSON object matching this schema:
{
  "headers": ["A", "B", "C", "D"...], // column headers
  "title": "Spreadsheet Title",
  "rows": [
    ["cell1", "cell2", "cell3"...],
    ["cell1", "cell2", "cell3"...]
  ]
}
Each cell should be formatted naturally (e.g. names like "Farida Mansour", prices like "7500000", leads interests like "SODIC East Duplex").
Egyptian phone numbers should match format like "+2010...", "+2012...", "+2011..." or "+2015...".
Ensure 5 to 10 rows are populated depending on the user request.
Respond ONLY with the JSON object. Do not wrap it in markdown code blocks like \`\`\`json.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Create a clean real-estate sheet with details based on the user request: "${prompt}"`,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json"
        }
      });
      
      const text = response.text || "{}";
      res.json(JSON.parse(text));
    } else {
      const systemInstruction = `You are Sierra Estates AI Spreadsheet Copilot. You analyze real estate spreadsheet data and help agents with Excel formulas.
Keep your analysis extremely professional, concise, action-oriented, and structured in human-friendly Markdown.
Reference specific cells (like A2, E10) or totals where appropriate. Highlighting positive and Bottleneck trends.`;
      
      const contentPrompt = `Here is the current spreadsheet data:
${JSON.stringify(spreadsheetData, null, 2)}

User request: "${prompt}"

Provide your expert analytical report or formula guidance.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contentPrompt,
        config: {
          systemInstruction: systemInstruction
        }
      });
      
      res.json({ text: response.text });
    }
  } catch (error: any) {
    console.error("Gemini Excel API error:", error);
    res.status(500).json({ error: error.message || "Failed to query Gemini excel service" });
  }
});

app.post("/api/gemini/generate-reply", async (req, res) => {
  try {
    const { chatHistory, customerName } = req.body;
    
    const prompt = `You are a professional real estate representative named Ahmed Fawzy at Sierra Estates.
Compose a custom, friendly, and helpful WhatsApp response to ${customerName || 'the client'} based on this conversation snippet:
---
${chatHistory || 'The client is asking for general information.'}
---
Keep your reply professional, reassuring, and very brief (1-2 sentences). Directly answer the client's intent.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini generate-reply error:", error);
    res.status(500).json({ error: error.message || "Failed to generate reply" });
  }
});

// ============================================================================
// PROPERTY FINDER ENTERPRISE API GATEWAY PROXY (HYBRID LIVE & SANDBOX SIMULATION)
// ============================================================================
let pfApiKey = process.env.PROPERTY_FINDER_API_KEY || "tMlCs.H28cDCwm6YZXKc8P06DSIK3e9mRMOvDRsi";
let pfApiSecret = process.env.PROPERTY_FINDER_API_SECRET || "xG7Ud54sQqDgX0hwcy0g54bfPWEzkcJW";

// Active in-memory sandbox registries
let pfListings: any[] = [
  {
    id: "pf-list-1",
    reference: "MI-3F-10M",
    title: "Luxurious 3-Bedroom Fully Furnished Apartment in Mivida",
    description: "Premium property located in premium district inside Mivida New Cairo. Features modern kitchen appliances, security systems, shared gym pool, and elegant balconies.",
    type: "apartment",
    category: "residential",
    price: 10000000,
    currency: "EGP",
    bedrooms: 3,
    bathrooms: 2,
    size: 140,
    locationId: 50,
    locationName: "Mivida New Cairo",
    images: ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80"],
    status: "live",
    updatedAt: new Date().toISOString()
  },
  {
    id: "pf-list-2",
    reference: "MV-4F-24M",
    title: "Luxury 4-Bedroom Townhouse in Mountain View iCity",
    description: "Beautiful modern townhouse with private garden, smart home ready features. 4 bedrooms, 3 bathrooms, prime placement.",
    type: "townhouse",
    category: "residential",
    price: 24000000,
    currency: "EGP",
    bedrooms: 4,
    bathrooms: 3,
    size: 220,
    locationId: 120,
    locationName: "Mountain View iCity",
    images: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&auto=format&fit=crop&q=80"],
    status: "draft",
    updatedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  }
];

let pfLeads: any[] = [
  {
    id: "pf-lead-1",
    entityType: "listing",
    channel: "whatsapp",
    status: "delivered",
    senderName: "Yasmin Sabry",
    senderPhone: "+201288829911",
    senderEmail: "yasmin.sabry@egyptianstars.com",
    listingId: "pf-list-1",
    listingReference: "MI-3F-10M",
    propertyInterest: "Mivida 3BR Apartment",
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    imported: false
  },
  {
    id: "pf-lead-2",
    entityType: "listing",
    channel: "whatsapp",
    status: "read",
    senderName: "Mohamed Salah",
    senderPhone: "+201001122334",
    senderEmail: "mo.salah@lfc.co.uk",
    listingId: "pf-list-2",
    listingReference: "MV-4F-24M",
    propertyInterest: "Mountain View 4BR Townhouse",
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    imported: false
  },
  {
    id: "pf-lead-3",
    entityType: "listing",
    channel: "call",
    status: "replied",
    senderName: "Amr Diab",
    senderPhone: "+201222223333",
    senderEmail: "hadaba@amrdiab.net",
    listingId: "pf-list-1",
    listingReference: "MI-3F-10M",
    propertyInterest: "Mivida 3BR Apartment",
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    imported: false
  }
];

// Helper to make live token exchange
async function getPFTokenOptional() {
  try {
    const response = await fetch("https://atlas.propertyfinder.com/v1/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ apiKey: pfApiKey, apiSecret: pfApiSecret }),
    });
    if (!response.ok) {
      throw new Error(`Token request status ${response.status}`);
    }
    const data = await response.json();
    return data.accessToken;
  } catch (err: any) {
    console.warn("PF live authentication bypass, running simulation backend:", err.message);
    return null;
  }
}

// REST endpoints for Property Finder integrations
app.get("/api/propertyfinder/credentials", async (req, res) => {
  const token = await getPFTokenOptional();
  res.json({
    apiKey: pfApiKey,
    apiSecret: pfApiSecret,
    isConfigured: true,
    authStatus: token ? "connected" : "simulated_sandbox",
    mode: token ? "live" : "simulation"
  });
});

app.post("/api/propertyfinder/credentials", async (req, res) => {
  const { apiKey, apiSecret } = req.body;
  if (!apiKey || !apiSecret) {
    return res.status(400).json({ error: "API key and API secret are required" });
  }
  pfApiKey = apiKey;
  pfApiSecret = apiSecret;
  
  const token = await getPFTokenOptional();
  res.json({
    success: true,
    authStatus: token ? "connected" : "simulated_sandbox",
    mode: token ? "live" : "simulation",
    message: token ? "Successfully authenticated with Property Finder Atlas gateway." : "Stored locally. Credentials mapped to Sandboxed Simulator."
  });
});

app.get("/api/propertyfinder/listings", async (req, res) => {
  try {
    const token = await getPFTokenOptional();
    if (token) {
      const response = await fetch("https://atlas.propertyfinder.com/v1/listings?draft=true&perPage=50", {
        headers: { "Accept": "application/json", "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const body = await response.json();
        return res.json({
          listings: body.results || pfListings,
          source: "atlas_gateway"
        });
      }
    }
  } catch (err) {
    console.warn("Error getting active PF Atlas listings, returning simulated DB:", err);
  }
  res.json({
    listings: pfListings,
    source: "simulation"
  });
});

app.post("/api/propertyfinder/listings", async (req, res) => {
  try {
    const { reference, title, description, type, category, price, currency, bedrooms, bathrooms, size, locationName, images } = req.body;
    
    // Server-side mapping matching Property Finder required fields specs
    const normalizedListing = {
      id: "pf-list-" + Date.now(),
      reference: reference || `PF-${Math.floor(1000 + Math.random() * 9000).toString()}`,
      title: title || "New Real Estate Listing",
      description: description || "No description provided.",
      type: type || "apartment",
      category: category || "residential",
      price: Number(price) || 5000000,
      currency: currency || "EGP",
      bedrooms: Number(bedrooms) || 3,
      bathrooms: Number(bathrooms) || 2,
      size: Number(size) || 120,
      locationId: 50,
      locationName: locationName || "New Cairo Compound",
      images: images && images.length > 0 ? images : ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80"],
      status: "draft" as const,
      updatedAt: new Date().toISOString()
    };

    pfListings.unshift(normalizedListing);

    // Try posting to Atlas
    const token = await getPFTokenOptional();
    if (token) {
      try {
        const response = await fetch("https://atlas.propertyfinder.com/v1/listings", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            "Accept": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            reference: normalizedListing.reference,
            title: { en: normalizedListing.title },
            description: { en: normalizedListing.description },
            type: normalizedListing.type,
            category: normalizedListing.category,
            furnishingType: "furnished",
            price: {
              type: "yearly",
              amounts: { yearly: normalizedListing.price }
            },
            location: { id: 50 },
            media: {
              images: normalizedListing.images.map(url => ({ original: { url } }))
            }
          })
        });
        if (response.ok) {
          const body = await response.json();
          normalizedListing.id = body.id || normalizedListing.id;
          return res.json({
            success: true,
            listing: normalizedListing,
            source: "atlas_gateway"
          });
        }
      } catch (err) {
        console.warn("PF Atlas post failed, saving in sandbox local DB:", err);
      }
    }

    res.json({
      success: true,
      listing: normalizedListing,
      source: "simulation"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create listing" });
  }
});

app.post("/api/propertyfinder/listings/:id/publish", async (req, res) => {
  const { id } = req.params;
  const listing = pfListings.find(l => l.id === id);
  if (listing) {
    listing.status = "live";
    listing.updatedAt = new Date().toISOString();
  }

  const token = await getPFTokenOptional();
  if (token && listing) {
    try {
      const response = await fetch(`https://atlas.propertyfinder.com/v1/listings/${listing.id}/publish`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
      });
      if (response.ok) {
        return res.json({ success: true, status: "live", source: "atlas_gateway" });
      }
    } catch (err) {
      console.warn("Atlas remote publish failed, fallback to local:", err);
    }
  }

  res.json({ success: true, status: "live", source: "simulation" });
});

app.post("/api/propertyfinder/listings/:id/unpublish", async (req, res) => {
  const { id } = req.params;
  const listing = pfListings.find(l => l.id === id);
  if (listing) {
    listing.status = "unpublished";
    listing.updatedAt = new Date().toISOString();
  }

  const token = await getPFTokenOptional();
  if (token && listing) {
    try {
      const response = await fetch(`https://atlas.propertyfinder.com/v1/listings/${listing.id}/unpublish`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
      });
      if (response.ok) {
        return res.json({ success: true, status: "unpublished", source: "atlas_gateway" });
      }
    } catch (err) {
      console.warn("Atlas remote unpublish failed, fallback to local:", err);
    }
  }

  res.json({ success: true, status: "unpublished", source: "simulation" });
});

app.delete("/api/propertyfinder/listings/:id", async (req, res) => {
  const { id } = req.params;
  pfListings = pfListings.filter(l => l.id !== id);

  const token = await getPFTokenOptional();
  if (token) {
    try {
      const response = await fetch(`https://atlas.propertyfinder.com/v1/listings/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
      });
      if (response.ok) {
        return res.json({ success: true, source: "atlas_gateway" });
      }
    } catch (err) {
      console.warn("Atlas delete failed:", err);
    }
  }

  res.json({ success: true, source: "simulation" });
});

app.get("/api/propertyfinder/leads", async (req, res) => {
  try {
    const token = await getPFTokenOptional();
    if (token) {
      const response = await fetch("https://atlas.propertyfinder.com/v1/leads?perPage=50", {
        headers: { "Accept": "application/json", "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const body = await response.json();
        const mapped = (body.data || []).map((lead: any) => ({
          id: lead.id || "pf-lead-" + Math.random(),
          entityType: lead.entityType || "listing",
          channel: lead.channel || "whatsapp",
          status: lead.status || "delivered",
          senderName: lead.sender?.name || "Anonymous Lead",
          senderPhone: lead.sender?.contacts?.find((c: any) => c.type === 'phone')?.value || "",
          senderEmail: lead.sender?.contacts?.find((c: any) => c.type === 'email')?.value || "",
          listingId: lead.listing?.id || "",
          listingReference: lead.listing?.reference || "",
          propertyInterest: lead.listing?.reference ? `Listing Ref: ${lead.listing.reference}` : "General Compound Inquiry",
          createdAt: lead.createdAt || new Date().toISOString(),
          imported: false
        }));
        return res.json({ leads: mapped, source: "atlas_gateway" });
      }
    }
  } catch (err) {
    console.warn("Error calling PF Atlas leads, returning local simulator databases:", err);
  }
  res.json({ leads: pfLeads, source: "simulation" });
});

// Real-time simulate an inbound or incoming Property Finder lead event in workspace
app.post("/api/propertyfinder/leads/simulate-trigger", (req, res) => {
  const names = ["Nour El Sherbiny", "Ziad El Sisi", "Hana El Zahed", "Ahmed El Sakka", "Mona Zaki"];
  const phones = ["+201229483321", "+201021234455", "+201115599887", "+201201201201", "+201088771122"];
  const compounds = ["Mivida Central", "Sierra Heights Twin", "Heliopolis Palace", "Villette Duplex", "Maadi Tower"];
  
  const idx = Math.floor(Math.random() * names.length);
  const newLead = {
    id: "pf-lead-" + Date.now().toString(),
    entityType: "listing" as const,
    channel: "whatsapp" as const,
    status: "delivered" as const,
    senderName: names[idx],
    senderPhone: phones[idx],
    senderEmail: `${names[idx].toLowerCase().replace(/\s/g, ".")}@cairomail.com`,
    listingId: "pf-list-1",
    listingReference: "MI-3F-10M",
    propertyInterest: compounds[idx],
    createdAt: new Date().toISOString(),
    imported: false
  };

  pfLeads.unshift(newLead);
  res.json({ success: true, lead: newLead });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Staging server in development mode with Vite proxy middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving build assets in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
