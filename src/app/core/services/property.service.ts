import { Injectable } from '@angular/core';
import { Property, PropertyImage } from '../../shared/property-card/property-card';

export interface PropertyDetail extends Property {
  remarks: string | null;
  verifiedBy: string | null;
}

@Injectable({ providedIn: 'root' })
export class PropertyService {
  private readonly mock: PropertyDetail[] = [
    {
      id: 1,
      ownerId: 'owner-uuid-1',
      title: 'Spacious 3BHK in Koramangala',
      description:
        'A beautifully furnished apartment with modular kitchen and covered parking. ' +
        'Close to tech parks and metro station. The apartment features hardwood flooring, ' +
        'large windows with city views, and a fully equipped kitchen. Building amenities ' +
        'include a gym, rooftop terrace, and 24/7 security.',
      addressLine: '12th Main, Koramangala 5th Block, Bengaluru',
      cityId: 1,
      monthlyRent: 35000,
      upfrontPayment: 70000,
      securityDeposit: 105000,
      thumbnailImgUrl:
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
      verificationStatusId: 3,
      availabilityStatusId: 1,
      createdAt: '2025-06-01T00:00:00Z',
      remarks: null,
      verifiedBy: null,
      propertyImages: [
        {
          id: 'img-1-1',
          imageUrl:
            'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
          description: 'Front view',
          displayOrder: 1,
        },
        {
          id: 'img-1-2',
          imageUrl:
            'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200&q=80',
          description: 'Living room',
          displayOrder: 2,
        },
        {
          id: 'img-1-3',
          imageUrl:
            'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80',
          description: 'Kitchen',
          displayOrder: 3,
        },
      ],
    },
    {
      id: 2,
      ownerId: 'owner-uuid-2',
      title: 'Cozy 1BHK in Indiranagar',
      description:
        'Compact and well-maintained 1BHK in one of Bengaluru\'s most vibrant neighbourhoods. ' +
        'Walking distance to the metro, restaurants and cafés. Comes with basic furniture.',
      addressLine: '100 Feet Road, Indiranagar, Bengaluru',
      cityId: 1,
      monthlyRent: 18000,
      upfrontPayment: 36000,
      securityDeposit: 54000,
      thumbnailImgUrl:
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
      verificationStatusId: 3,
      availabilityStatusId: 2,
      createdAt: '2025-05-15T00:00:00Z',
      remarks: null,
      verifiedBy: null,
      propertyImages: [
        {
          id: 'img-2-1',
          imageUrl:
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
          description: 'Living area',
          displayOrder: 1,
        },
      ],
    },
    {
      id: 3,
      ownerId: 'owner-uuid-3',
      title: 'Premium 2BHK near Whitefield IT Park',
      description:
        'Modern apartment in a gated community with gym, swimming pool and 24/7 security. ' +
        'Walking distance to EPIP Zone. Ideal for IT professionals. The unit has been recently ' +
        'renovated with premium fittings and smart home features.',
      addressLine: 'ITPL Main Road, Whitefield, Bengaluru',
      cityId: 1,
      monthlyRent: 28000,
      upfrontPayment: 56000,
      securityDeposit: 84000,
      thumbnailImgUrl:
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80',
      verificationStatusId: 2,
      availabilityStatusId: 1,
      createdAt: '2025-06-20T00:00:00Z',
      remarks: null,
      verifiedBy: null,
      propertyImages: [
        {
          id: 'img-3-1',
          imageUrl:
            'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80',
          description: 'Building exterior',
          displayOrder: 1,
        },
      ],
    },
    {
      id: 4,
      ownerId: 'owner-uuid-4',
      title: 'Studio Apartment in HSR Layout',
      description: 'Compact and fully furnished studio ideal for working professionals.',
      addressLine: 'Sector 2, HSR Layout, Bengaluru',
      cityId: 1,
      monthlyRent: 12000,
      upfrontPayment: 24000,
      securityDeposit: 36000,
      thumbnailImgUrl: null,
      verificationStatusId: 1,
      availabilityStatusId: 3,
      createdAt: '2025-07-01T00:00:00Z',
      remarks: null,
      verifiedBy: null,
      propertyImages: [],
    },
    {
      id: 5,
      ownerId: 'owner-uuid-5',
      title: 'Luxury 4BHK Villa in Sarjapur',
      description:
        'Stunning independent villa with private garden, home theatre and modular kitchen. ' +
        'Gated community with clubhouse and swimming pool. Perfect for large families.',
      addressLine: 'Sarjapur Road, Carmelaram, Bengaluru',
      cityId: 1,
      monthlyRent: 75000,
      upfrontPayment: 150000,
      securityDeposit: 225000,
      thumbnailImgUrl:
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80',
      verificationStatusId: 3,
      availabilityStatusId: 1,
      createdAt: '2025-05-10T00:00:00Z',
      remarks: null,
      verifiedBy: null,
      propertyImages: [
        {
          id: 'img-5-1',
          imageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80',
          description: 'Villa exterior',
          displayOrder: 1,
        },
        {
          id: 'img-5-2',
          imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80',
          description: 'Garden view',
          displayOrder: 2,
        },
      ],
    },
    {
      id: 6,
      ownerId: 'owner-uuid-6',
      title: '2BHK Apartment in Jayanagar',
      description:
        'Well-ventilated apartment in the heart of Jayanagar with excellent connectivity. ' +
        'Close to schools, markets and hospitals. Semi-furnished with wardrobes and fans.',
      addressLine: '4th Block, Jayanagar, Bengaluru',
      cityId: 1,
      monthlyRent: 22000,
      upfrontPayment: 44000,
      securityDeposit: 66000,
      thumbnailImgUrl:
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80',
      verificationStatusId: 3,
      availabilityStatusId: 1,
      createdAt: '2025-04-20T00:00:00Z',
      remarks: null,
      verifiedBy: null,
      propertyImages: [
        {
          id: 'img-6-1',
          imageUrl: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80',
          description: 'Living room',
          displayOrder: 1,
        },
      ],
    },
    {
      id: 7,
      ownerId: 'owner-uuid-7',
      title: '1BHK Near Electronic City',
      description:
        'Affordable and clean 1BHK close to the Electronic City tech corridor. ' +
        'Good public transport links. Includes water purifier and washing machine.',
      addressLine: 'Phase 1, Electronic City, Bengaluru',
      cityId: 1,
      monthlyRent: 14000,
      upfrontPayment: 28000,
      securityDeposit: 42000,
      thumbnailImgUrl:
        'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=80',
      verificationStatusId: 3,
      availabilityStatusId: 2,
      createdAt: '2025-06-05T00:00:00Z',
      remarks: null,
      verifiedBy: null,
      propertyImages: [
        {
          id: 'img-7-1',
          imageUrl: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=80',
          description: 'Bedroom',
          displayOrder: 1,
        },
      ],
    },
    {
      id: 8,
      ownerId: 'owner-uuid-8',
      title: 'Modern 3BHK in Hebbal',
      description:
        'Spacious flat with three well-lit bedrooms and a large balcony overlooking the lake. ' +
        'Minutes from the airport expressway and Manyata Tech Park.',
      addressLine: 'Outer Ring Road, Hebbal, Bengaluru',
      cityId: 1,
      monthlyRent: 42000,
      upfrontPayment: 84000,
      securityDeposit: 126000,
      thumbnailImgUrl:
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80',
      verificationStatusId: 3,
      availabilityStatusId: 1,
      createdAt: '2025-03-12T00:00:00Z',
      remarks: null,
      verifiedBy: null,
      propertyImages: [
        {
          id: 'img-8-1',
          imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80',
          description: 'Living area',
          displayOrder: 1,
        },
        {
          id: 'img-8-2',
          imageUrl: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1200&q=80',
          description: 'Balcony lake view',
          displayOrder: 2,
        },
      ],
    },
    {
      id: 9,
      ownerId: 'owner-uuid-9',
      title: 'Furnished Studio in BTM Layout',
      description:
        'Fully furnished studio with AC, TV and high-speed internet. ' +
        'Located near BTM BDA Complex with easy access to Silk Board junction.',
      addressLine: 'Stage 2, BTM Layout, Bengaluru',
      cityId: 1,
      monthlyRent: 13500,
      upfrontPayment: 27000,
      securityDeposit: 40500,
      thumbnailImgUrl:
        'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=80',
      verificationStatusId: 2,
      availabilityStatusId: 1,
      createdAt: '2025-06-18T00:00:00Z',
      remarks: null,
      verifiedBy: null,
      propertyImages: [
        {
          id: 'img-9-1',
          imageUrl: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=80',
          description: 'Studio interior',
          displayOrder: 1,
        },
      ],
    },
    {
      id: 10,
      ownerId: 'owner-uuid-10',
      title: '3BHK Penthouse in Yelahanka',
      description:
        'Exclusive penthouse with rooftop access, panoramic city views, and premium finishes. ' +
        'Comes with two dedicated parking spots and a private terrace garden.',
      addressLine: 'New Town, Yelahanka, Bengaluru',
      cityId: 1,
      monthlyRent: 65000,
      upfrontPayment: 130000,
      securityDeposit: 195000,
      thumbnailImgUrl:
        'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=1200&q=80',
      verificationStatusId: 3,
      availabilityStatusId: 1,
      createdAt: '2025-02-28T00:00:00Z',
      remarks: null,
      verifiedBy: null,
      propertyImages: [
        {
          id: 'img-10-1',
          imageUrl: 'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=1200&q=80',
          description: 'Terrace',
          displayOrder: 1,
        },
      ],
    },
    {
      id: 11,
      ownerId: 'owner-uuid-11',
      title: '2BHK in Malleshwaram',
      description:
        'Classic apartment in one of Bengaluru\'s oldest and most charming neighbourhoods. ' +
        'Tree-lined streets, temples nearby, and excellent connectivity via metro.',
      addressLine: '8th Cross, Malleshwaram, Bengaluru',
      cityId: 1,
      monthlyRent: 20000,
      upfrontPayment: 40000,
      securityDeposit: 60000,
      thumbnailImgUrl:
        'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=1200&q=80',
      verificationStatusId: 3,
      availabilityStatusId: 3,
      createdAt: '2025-01-15T00:00:00Z',
      remarks: null,
      verifiedBy: null,
      propertyImages: [
        {
          id: 'img-11-1',
          imageUrl: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=1200&q=80',
          description: 'Building facade',
          displayOrder: 1,
        },
      ],
    },
    {
      id: 12,
      ownerId: 'owner-uuid-12',
      title: '1BHK in Bellandur',
      description:
        'Budget-friendly 1BHK near Bellandur Lake. Ideal for freshers joining nearby tech companies. ' +
        'Society amenities include power backup, security and water supply.',
      addressLine: 'Bellandur Main Road, Bengaluru',
      cityId: 1,
      monthlyRent: 16000,
      upfrontPayment: 32000,
      securityDeposit: 48000,
      thumbnailImgUrl:
        'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=1200&q=80',
      verificationStatusId: 1,
      availabilityStatusId: 1,
      createdAt: '2025-07-02T00:00:00Z',
      remarks: null,
      verifiedBy: null,
      propertyImages: [],
    },
    {
      id: 13,
      ownerId: 'owner-uuid-1',
      title: 'Semi-Furnished 2BHK in Rajajinagar',
      description:
        'Spacious two-bedroom flat in a prime residential area. Large hall, balcony ' +
        'and modular kitchen. Easy access to Chord Road and metro.',
      addressLine: '1st Block, Rajajinagar, Bengaluru',
      cityId: 1,
      monthlyRent: 23000,
      upfrontPayment: 46000,
      securityDeposit: 69000,
      thumbnailImgUrl:
        'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200&q=80',
      verificationStatusId: 3,
      availabilityStatusId: 1,
      createdAt: '2025-04-01T00:00:00Z',
      remarks: null,
      verifiedBy: null,
      propertyImages: [
        {
          id: 'img-13-1',
          imageUrl: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200&q=80',
          description: 'Living room',
          displayOrder: 1,
        },
      ],
    },
    {
      id: 14,
      ownerId: 'owner-uuid-3',
      title: '4BHK Independent House in JP Nagar',
      description:
        'Ground-plus-one independent house with large front yard, 4 bedrooms and 3 bathrooms. ' +
        'Quiet residential lane, close to metro and shopping malls.',
      addressLine: '7th Phase, JP Nagar, Bengaluru',
      cityId: 1,
      monthlyRent: 55000,
      upfrontPayment: 110000,
      securityDeposit: 165000,
      thumbnailImgUrl:
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80',
      verificationStatusId: 3,
      availabilityStatusId: 1,
      createdAt: '2025-03-25T00:00:00Z',
      remarks: null,
      verifiedBy: null,
      propertyImages: [
        {
          id: 'img-14-1',
          imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80',
          description: 'House exterior',
          displayOrder: 1,
        },
        {
          id: 'img-14-2',
          imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
          description: 'Front yard',
          displayOrder: 2,
        },
      ],
    },
    {
      id: 15,
      ownerId: 'owner-uuid-5',
      title: 'Studio Near Marathahalli Bridge',
      description:
        'Compact, affordable studio perfect for solo professionals. ' +
        'Walking distance to Marathahalli junction with shops and eateries all around.',
      addressLine: 'Marathahalli, Bengaluru',
      cityId: 1,
      monthlyRent: 11000,
      upfrontPayment: 22000,
      securityDeposit: 33000,
      thumbnailImgUrl:
        'https://images.unsplash.com/photo-1463797221720-6b07e6426c24?w=1200&q=80',
      verificationStatusId: 2,
      availabilityStatusId: 2,
      createdAt: '2025-05-30T00:00:00Z',
      remarks: null,
      verifiedBy: null,
      propertyImages: [
        {
          id: 'img-15-1',
          imageUrl: 'https://images.unsplash.com/photo-1463797221720-6b07e6426c24?w=1200&q=80',
          description: 'Interior',
          displayOrder: 1,
        },
      ],
    },
    {
      id: 16,
      ownerId: 'owner-uuid-6',
      title: '3BHK in Banashankari',
      description:
        'Spacious apartment with well-designed interiors and large bedrooms. ' +
        'Proximity to BDA complex, schools and hospitals. Metro station within 1 km.',
      addressLine: 'Banashankari 2nd Stage, Bengaluru',
      cityId: 1,
      monthlyRent: 30000,
      upfrontPayment: 60000,
      securityDeposit: 90000,
      thumbnailImgUrl:
        'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1200&q=80',
      verificationStatusId: 3,
      availabilityStatusId: 1,
      createdAt: '2025-02-10T00:00:00Z',
      remarks: null,
      verifiedBy: null,
      propertyImages: [
        {
          id: 'img-16-1',
          imageUrl: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1200&q=80',
          description: 'Bedroom',
          displayOrder: 1,
        },
      ],
    },
    {
      id: 17,
      ownerId: 'owner-uuid-7',
      title: 'Gated Community 2BHK in Hennur',
      description:
        'Brand new 2BHK in a premium gated community with club house, jogging track and indoor games. ' +
        'Close to Hennur Road and Outer Ring Road interchange.',
      addressLine: 'Hennur Road, Bengaluru',
      cityId: 1,
      monthlyRent: 26000,
      upfrontPayment: 52000,
      securityDeposit: 78000,
      thumbnailImgUrl:
        'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=1200&q=80',
      verificationStatusId: 1,
      availabilityStatusId: 1,
      createdAt: '2025-06-28T00:00:00Z',
      remarks: null,
      verifiedBy: null,
      propertyImages: [
        {
          id: 'img-17-1',
          imageUrl: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=1200&q=80',
          description: 'Apartment complex',
          displayOrder: 1,
        },
      ],
    },
    {
      id: 18,
      ownerId: 'owner-uuid-8',
      title: '1BHK with Lake View in Nagawara',
      description:
        'Peaceful apartment overlooking Nagawara Lake. Ideal for someone who loves nature and calm surroundings. ' +
        'Well-maintained society with power backup and covered parking.',
      addressLine: 'Nagawara Lake Road, Bengaluru',
      cityId: 1,
      monthlyRent: 17000,
      upfrontPayment: 34000,
      securityDeposit: 51000,
      thumbnailImgUrl:
        'https://images.unsplash.com/photo-1516455590571-18256e5bb9ff?w=1200&q=80',
      verificationStatusId: 3,
      availabilityStatusId: 1,
      createdAt: '2025-05-05T00:00:00Z',
      remarks: null,
      verifiedBy: null,
      propertyImages: [
        {
          id: 'img-18-1',
          imageUrl: 'https://images.unsplash.com/photo-1516455590571-18256e5bb9ff?w=1200&q=80',
          description: 'Lake view from balcony',
          displayOrder: 1,
        },
      ],
    },
    {
      id: 19,
      ownerId: 'owner-uuid-9',
      title: 'Budget 1BHK in Bommanahalli',
      description:
        'No-frills but clean 1BHK great for students and first-time renters. ' +
        'Grocery stores and bus stop within 5-minute walk.',
      addressLine: 'Bommanahalli, Bengaluru',
      cityId: 1,
      monthlyRent: 10000,
      upfrontPayment: 20000,
      securityDeposit: 30000,
      thumbnailImgUrl:
        'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=1200&q=80',
      verificationStatusId: 3,
      availabilityStatusId: 2,
      createdAt: '2025-01-20T00:00:00Z',
      remarks: null,
      verifiedBy: null,
      propertyImages: [
        {
          id: 'img-19-1',
          imageUrl: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=1200&q=80',
          description: 'Room interior',
          displayOrder: 1,
        },
      ],
    },
    {
      id: 20,
      ownerId: 'owner-uuid-10',
      title: 'Duplex 3BHK in Cunningham Road',
      description:
        'Elegant duplex apartment in a prime central location with high-end finishes, ' +
        'double-height living room and a private rooftop. Walking distance to MG Road.',
      addressLine: 'Cunningham Road, Bengaluru',
      cityId: 1,
      monthlyRent: 80000,
      upfrontPayment: 160000,
      securityDeposit: 240000,
      thumbnailImgUrl:
        'https://images.unsplash.com/photo-1600210492486-724fe5c67fb3?w=1200&q=80',
      verificationStatusId: 3,
      availabilityStatusId: 1,
      createdAt: '2025-04-15T00:00:00Z',
      remarks: null,
      verifiedBy: null,
      propertyImages: [
        {
          id: 'img-20-1',
          imageUrl: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb3?w=1200&q=80',
          description: 'Living room',
          displayOrder: 1,
        },
        {
          id: 'img-20-2',
          imageUrl: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200&q=80',
          description: 'Rooftop',
          displayOrder: 2,
        },
      ],
    },
  ];

  getAll(): PropertyDetail[] {
    return this.mock;
  }

  getById(id: number): PropertyDetail | undefined {
    return this.mock.find((p) => p.id === id);
  }
}
