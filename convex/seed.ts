import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Bay Area Venues
const VENUES = [
  {
    name: "924 Gilman",
    address: "924 Gilman Street",
    city: "Berkeley",
    capacity: 300,
    coordinates: { lat: 37.8783, lng: -122.2999 },
    description: "All-ages volunteer-run punk venue since 1986",
    genres: ["rock", "indie", "alternative"] as const,
  },
  {
    name: "The Chapel",
    address: "777 Valencia Street",
    city: "San Francisco",
    capacity: 400,
    coordinates: { lat: 37.7602, lng: -122.4216 },
    description: "Historic Mission District venue in a converted church",
    genres: ["indie", "folk", "rock"] as const,
  },
  {
    name: "Bottom of the Hill",
    address: "1233 17th Street",
    city: "San Francisco",
    capacity: 350,
    coordinates: { lat: 37.7649, lng: -122.3979 },
    description: "Legendary Potrero Hill rock club since 1991",
    genres: ["rock", "indie", "alternative"] as const,
  },
  {
    name: "The Fillmore",
    address: "1805 Geary Boulevard",
    city: "San Francisco",
    capacity: 1150,
    coordinates: { lat: 37.784, lng: -122.4333 },
    description: "Iconic venue with rich musical history",
    genres: ["rock", "pop", "jazz", "electronic"] as const,
  },
  {
    name: "Slim's",
    address: "333 11th Street",
    city: "San Francisco",
    capacity: 350,
    coordinates: { lat: 37.7706, lng: -122.4127 },
    description: "SoMa nightclub co-founded by Boz Scaggs",
    genres: ["rock", "jazz", "folk"] as const,
  },
  {
    name: "The Independent",
    address: "628 Divisadero Street",
    city: "San Francisco",
    capacity: 500,
    coordinates: { lat: 37.7762, lng: -122.4378 },
    description: "Intimate Divisadero venue for live music",
    genres: ["indie", "electronic", "pop"] as const,
  },
  {
    name: "Great American Music Hall",
    address: "859 O'Farrell Street",
    city: "San Francisco",
    capacity: 600,
    coordinates: { lat: 37.7855, lng: -122.4186 },
    description: "Ornate 1907 venue with excellent acoustics",
    genres: ["jazz", "folk", "rock", "indie"] as const,
  },
  {
    name: "Yoshi's Oakland",
    address: "510 Embarcadero West",
    city: "Oakland",
    capacity: 310,
    coordinates: { lat: 37.7955, lng: -122.2761 },
    description: "World-class jazz club and Japanese restaurant",
    genres: ["jazz"] as const,
  },
  {
    name: "The New Parish",
    address: "579 18th Street",
    city: "Oakland",
    capacity: 500,
    coordinates: { lat: 37.8087, lng: -122.2706 },
    description: "Uptown Oakland's premier live music venue",
    genres: ["electronic", "pop", "indie"] as const,
  },
  {
    name: "Cornerstone Berkeley",
    address: "2367 Shattuck Avenue",
    city: "Berkeley",
    capacity: 250,
    coordinates: { lat: 37.8667, lng: -122.2681 },
    description: "Craft beer and live music in downtown Berkeley",
    genres: ["folk", "indie", "jazz"] as const,
  },
  {
    name: "Freight & Salvage",
    address: "2020 Addison Street",
    city: "Berkeley",
    capacity: 250,
    coordinates: { lat: 37.8701, lng: -122.2687 },
    description: "Folk and traditional music since 1968",
    genres: ["folk", "jazz"] as const,
  },
  {
    name: "The Starry Plough",
    address: "3101 Shattuck Avenue",
    city: "Berkeley",
    capacity: 150,
    coordinates: { lat: 37.8551, lng: -122.2652 },
    description: "Irish pub with live music and open mic nights",
    genres: ["folk", "rock", "indie"] as const,
  },
];

// Sample Bands
const BANDS = [
  {
    name: "The Midnight Waves",
    genres: ["indie", "alternative"] as const,
    location: "Oakland, CA",
    bio: "Dream pop trio blending shoegaze textures with catchy melodies",
    memberCount: 3,
  },
  {
    name: "Brass Monkey Collective",
    genres: ["jazz", "electronic"] as const,
    location: "San Francisco, CA",
    bio: "Modern jazz ensemble pushing boundaries with funk and hip-hop influences",
    memberCount: 7,
  },
  {
    name: "Voltage Kids",
    genres: ["electronic", "pop"] as const,
    location: "Berkeley, CA",
    bio: "Synth-driven duo creating dancefloor-ready electronic anthems",
    memberCount: 2,
  },
  {
    name: "The Rustic Hearts",
    genres: ["folk", "indie"] as const,
    location: "San Francisco, CA",
    bio: "Americana outfit with rich harmonies and storytelling lyrics",
    memberCount: 4,
  },
  {
    name: "Neon Vandals",
    genres: ["rock", "alternative"] as const,
    location: "Oakland, CA",
    bio: "High-energy garage rock with punk attitude",
    memberCount: 4,
  },
  {
    name: "Crystal Method Theory",
    genres: ["alternative", "rock"] as const,
    location: "San Francisco, CA",
    bio: "Art rock collective exploring sonic landscapes",
    memberCount: 5,
  },
  {
    name: "Sugar Rush",
    genres: ["pop", "electronic"] as const,
    location: "San Francisco, CA",
    bio: "Infectious pop hooks with a Bay Area twist",
    memberCount: 4,
  },
  {
    name: "The Echo Chamber",
    genres: ["indie", "rock"] as const,
    location: "Berkeley, CA",
    bio: "Post-punk revival with angular guitars and driving rhythms",
    memberCount: 4,
  },
  {
    name: "Blue Note Society",
    genres: ["jazz"] as const,
    location: "Oakland, CA",
    bio: "Classic jazz quartet honoring the bebop tradition",
    memberCount: 4,
  },
  {
    name: "Feral Youth",
    genres: ["rock", "alternative"] as const,
    location: "San Francisco, CA",
    bio: "Loud, fast, and uncompromising punk rock",
    memberCount: 3,
  },
];

// Seed function
export const seedDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existingVenues = await ctx.db.query("venues").take(1);
    if (existingVenues.length > 0) {
      return { message: "Database already seeded" };
    }

    // Seed venues
    const venueIds: Record<string, any> = {};
    for (const venue of VENUES) {
      const id = await ctx.db.insert("venues", {
        ...venue,
        genres: [...venue.genres],
      });
      venueIds[venue.name] = id;
    }

    // Create a system user for seed data
    const systemUserId = await ctx.db.insert("users", {
      clerkId: "system_seed_user",
      role: "musician",
      name: "System",
      email: "system@ear-plug.app",
      memberSince: Date.now(),
    });

    // Seed bands
    const bandIds: Record<string, any> = {};
    for (const band of BANDS) {
      const id = await ctx.db.insert("bands", {
        userId: systemUserId,
        name: band.name,
        genres: [...band.genres],
        location: band.location,
        bio: band.bio,
        memberCount: band.memberCount,
        createdAt: Date.now(),
      });
      bandIds[band.name] = id;
    }

    // Seed events (upcoming shows)
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const events: Array<{
      title: string;
      bandId: any;
      venueId: any;
      dateTime: number;
      genres: ("indie" | "rock" | "jazz" | "electronic" | "folk" | "pop" | "alternative")[];
      capacity: number;
      rsvpCount: number;
      price: number;
      description: string;
      status: "confirmed" | "hold" | "available";
    }> = [
      {
        title: "Indie Night: The Midnight Waves + The Echo Chamber",
        bandId: bandIds["The Midnight Waves"],
        venueId: venueIds["The Chapel"],
        dateTime: now + 3 * day + 20 * 60 * 60 * 1000,
        genres: ["indie", "alternative"],
        capacity: 300,
        rsvpCount: 127,
        price: 1500,
        description:
          "Two of the Bay's best indie bands team up for an unforgettable night of dreamy soundscapes and angular guitars.",
        status: "confirmed",
      },
      {
        title: "Jazz Under the Stars",
        bandId: bandIds["Brass Monkey Collective"],
        venueId: venueIds["Yoshi's Oakland"],
        dateTime: now + 5 * day + 19 * 60 * 60 * 1000,
        genres: ["jazz", "electronic"],
        capacity: 200,
        rsvpCount: 89,
        price: 2500,
        description:
          "An evening of modern jazz with the acclaimed Brass Monkey Collective.",
        status: "confirmed",
      },
      {
        title: "Electronic Dance Party",
        bandId: bandIds["Voltage Kids"],
        venueId: venueIds["The New Parish"],
        dateTime: now + 7 * day + 22 * 60 * 60 * 1000,
        genres: ["electronic", "pop"],
        capacity: 400,
        rsvpCount: 234,
        price: 2000,
        description:
          "Get ready to dance! Voltage Kids bring their synth-heavy bangers to Oakland.",
        status: "confirmed",
      },
      {
        title: "Folk & Ale: The Rustic Hearts",
        bandId: bandIds["The Rustic Hearts"],
        venueId: venueIds["Freight & Salvage"],
        dateTime: now + 10 * day + 19 * 60 * 60 * 1000,
        genres: ["folk", "indie"],
        capacity: 200,
        rsvpCount: 78,
        price: 1800,
        description:
          "Warm harmonies and heartfelt storytelling in Berkeley's finest folk venue.",
        status: "confirmed",
      },
      {
        title: "Garage Rock Revival",
        bandId: bandIds["Neon Vandals"],
        venueId: venueIds["924 Gilman"],
        dateTime: now + 2 * day + 20 * 60 * 60 * 1000,
        genres: ["rock", "alternative"],
        capacity: 250,
        rsvpCount: 156,
        price: 1000,
        description:
          "Raw, loud, and unforgettable. Neon Vandals tear up the legendary Gilman stage.",
        status: "confirmed",
      },
      {
        title: "Art Rock Experiment",
        bandId: bandIds["Crystal Method Theory"],
        venueId: venueIds["The Independent"],
        dateTime: now + 14 * day + 21 * 60 * 60 * 1000,
        genres: ["alternative", "rock"],
        capacity: 400,
        rsvpCount: 112,
        price: 2200,
        description:
          "Prepare for a journey through sonic landscapes with Crystal Method Theory.",
        status: "confirmed",
      },
      {
        title: "Pop Goes the Night",
        bandId: bandIds["Sugar Rush"],
        venueId: venueIds["Bottom of the Hill"],
        dateTime: now + 4 * day + 20 * 60 * 60 * 1000,
        genres: ["pop", "electronic"],
        capacity: 300,
        rsvpCount: 201,
        price: 1500,
        description:
          "Sugar Rush delivers the hooks and the good vibes. Come ready to sing along!",
        status: "confirmed",
      },
      {
        title: "Bebop Tribute Night",
        bandId: bandIds["Blue Note Society"],
        venueId: venueIds["Great American Music Hall"],
        dateTime: now + 8 * day + 19 * 60 * 60 * 1000,
        genres: ["jazz"],
        capacity: 500,
        rsvpCount: 145,
        price: 3000,
        description:
          "Honoring the masters of bebop in one of SF's most beautiful venues.",
        status: "confirmed",
      },
      {
        title: "Punk's Not Dead",
        bandId: bandIds["Feral Youth"],
        venueId: venueIds["924 Gilman"],
        dateTime: now + 9 * day + 19 * 60 * 60 * 1000,
        genres: ["rock", "alternative"],
        capacity: 300,
        rsvpCount: 223,
        price: 800,
        description:
          "Feral Youth proves punk is alive and kicking. All ages, no attitude.",
        status: "confirmed",
      },
      {
        title: "Sunday Sessions: The Echo Chamber",
        bandId: bandIds["The Echo Chamber"],
        venueId: venueIds["Cornerstone Berkeley"],
        dateTime: now + 6 * day + 17 * 60 * 60 * 1000,
        genres: ["indie", "rock"],
        capacity: 200,
        rsvpCount: 67,
        price: 0,
        description:
          "Free show! Catch The Echo Chamber in an intimate afternoon set.",
        status: "confirmed",
      },
    ];

    for (const event of events) {
      await ctx.db.insert("events", event);
    }

    // Seed open dates
    const openDates = [
      {
        venueId: venueIds["Bottom of the Hill"],
        date: now + 21 * day,
        offeredPay: 30000,
        genre: "rock" as const,
        status: "open" as const,
        description: "Looking for a headliner for our Saturday night slot",
        createdAt: now,
      },
      {
        venueId: venueIds["The Chapel"],
        date: now + 28 * day,
        offeredPay: 50000,
        genre: "indie" as const,
        status: "open" as const,
        description: "Opening slot for touring act. Great exposure!",
        createdAt: now,
      },
      {
        venueId: venueIds["Yoshi's Oakland"],
        date: now + 18 * day,
        offeredPay: 40000,
        genre: "jazz" as const,
        status: "open" as const,
        description: "Wednesday residency available for jazz group",
        createdAt: now,
      },
      {
        venueId: venueIds["The Independent"],
        date: now + 35 * day,
        offeredPay: 45000,
        genre: "electronic" as const,
        status: "open" as const,
        description: "Late night electronic showcase",
        createdAt: now,
      },
      {
        venueId: venueIds["Freight & Salvage"],
        date: now + 25 * day,
        offeredPay: 25000,
        genre: "folk" as const,
        status: "open" as const,
        description: "Acoustic folk night - looking for authentic artists",
        createdAt: now,
      },
    ];

    for (const openDate of openDates) {
      await ctx.db.insert("openDates", openDate);
    }

    return {
      message: "Database seeded successfully",
      venues: VENUES.length,
      bands: BANDS.length,
      events: events.length,
      openDates: openDates.length,
    };
  },
});

// Clear seed data (for development)
export const clearDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete in reverse order of dependencies
    const tables = [
      "applications",
      "openDates",
      "notifications",
      "messages",
      "conversations",
      "savedVenues",
      "savedArtists",
      "likes",
      "rsvps",
      "events",
      "bands",
      "venues",
    ];

    for (const table of tables) {
      const records = await ctx.db.query(table as any).collect();
      for (const record of records) {
        await ctx.db.delete(record._id);
      }
    }

    // Delete system user
    const systemUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), "system_seed_user"))
      .first();
    if (systemUser) {
      await ctx.db.delete(systemUser._id);
    }

    return { message: "Database cleared" };
  },
});
