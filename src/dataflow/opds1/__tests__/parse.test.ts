import {
  OPDSCollectionLink,
  OPDSAcquisitionLink,
  OPDSShelfLink
} from "opds-feed-parser";
import * as factory from "./OPDSFactory";
import { entryToBook, feedToCollection } from "../parse";
const sanitizeHtml = require("dompurify").sanitize;

describe("OPDSDataAdapter", () => {
  test("extracts book info", () => {
    const largeImageLink = factory.artworkLink({
      href: "https://dlotdqc6pnwqb.cloudfront.net/3M/crrmnr9/cover.jpg",
      rel: "http://opds-spec.org/image"
    });

    const thumbImageLink = factory.artworkLink({
      href: "http://example.com/testthumb.jpg",
      rel: "http://opds-spec.org/image/thumbnail"
    });

    const openAccessLink = factory.acquisitionLink({
      href: "http://example.com/open.epub",
      rel: OPDSAcquisitionLink.OPEN_ACCESS_REL
    });

    const borrowLink = factory.acquisitionLink({
      href: "http://example.com/borrow",
      rel: OPDSAcquisitionLink.BORROW_REL,
      availability: { availability: "unavailable" },
      holds: { total: 20, position: 5 },
      copies: { total: 2, available: 0 }
    });

    const fulfillmentLink = factory.acquisitionLink({
      href: "http://example.com/fulfill",
      rel: OPDSAcquisitionLink.GENERIC_REL,
      type: "application/atom+xml;type=entry;profile=opds-catalog",
      indirectAcquisitions: [
        {
          type:
            "text/html;profile=http://librarysimplified.org/terms/profiles/streaming-media"
        }
      ]
    });

    const collectionLink = factory.collectionLink({
      href: "collection%20url",
      rel: OPDSCollectionLink.REL,
      title: "collection title"
    });

    const entry = factory.entry({
      id: "urn:librarysimplified.org/terms/id/3M%20ID/crrmnr91",
      title: "The Mayan Secrets",
      authors: [
        factory.contributor({ name: "Clive Cussler" }),
        factory.contributor({ name: "Thomas Perry" })
      ],
      contributors: [factory.contributor({ name: "contributor" })],
      subtitle: "A Sam and Remi Fargo Adventure",
      summary: factory.summary({
        content:
          "&lt;b&gt;Sam and Remi Fargo race for treasure&#8212;and survival&#8212;in this lightning-paced new adventure from #1&lt;i&gt; New York Times&lt;/i&gt; bestselling author Clive Cussler.&lt;/b&gt;&lt;br /&gt;&lt;br /&gt;Husband-and-wife team Sam and Remi Fargo are in Mexico when they come upon a remarkable discovery&#8212;the mummified remainsof a man clutching an ancient sealed pot. Within the pot is a Mayan book larger than any known before.&lt;br /&gt;&lt;br /&gt;The book contains astonishing information about the Mayans, their cities, and about mankind itself. The secrets are so powerful that some people would do anything to possess them&#8212;as the Fargos are about to find out. Many men and women are going to die for that book.<script>alert('danger!');</script>"
      }),
      categories: [
        factory.category({ label: "label" }),
        factory.category({ term: "no label" }),
        factory.category({ label: "label 2" })
      ],
      links: [
        largeImageLink,
        thumbImageLink,
        openAccessLink,
        borrowLink,
        fulfillmentLink,
        collectionLink
      ],
      issued: "2014-06-08",
      publisher: "Fake Publisher",
      series: {
        name: "Fake Series",
        position: 2
      },
      language: "en"
    });

    const acquisitionFeed = factory.acquisitionFeed({
      id: "some id",
      entries: [entry],
      unparsed: "unparsed data"
    });

    const collection = feedToCollection(acquisitionFeed, "http://test-url.com");
    expect(collection.books.length).toBe(0);
    expect(collection.lanes.length).toBe(1);
    expect(collection.lanes[0].url).toBe(
      `http://test-url.com/${collectionLink.href}`
    );
    expect(collection.raw).toBe("unparsed data");

    const book = collection.lanes[0].books[0];

    expect(book.id).toBe(entry.id);
    expect(book.title).toBe(entry.title);
    expect(book.authors?.length).toBe(2);
    expect(book.authors?.[0]).toBe(entry.authors[0].name);
    expect(book.authors?.[1]).toBe(entry.authors[1].name);
    expect(book.contributors?.length).toBe(1);
    expect(book.contributors?.[0]).toBe(entry.contributors[0].name);
    expect(book.series?.name).toBe(entry.series.name);
    expect(book.series?.position).toBe(entry.series.position);
    expect(book.subtitle).toBe(entry.subtitle);
    expect(book.summary).toBe(sanitizeHtml(entry.summary.content));
    expect(book.summary).toMatch(
      /Many men and women are going to die for that book./
    );
    expect(book.summary).not.toMatch(/script/);
    expect(book.summary).not.toMatch(/danger/);
    expect(book.categories?.length).toBe(2);
    expect(book.categories).toContain("label");
    expect(book.categories).toContain("label 2");
    expect(book.imageUrl).toBe(thumbImageLink.href);
    expect(book.publisher).toBe("Fake Publisher");
    expect(book.published).toBe("June 8, 2014");
    expect(book.language).toBe("en");
    expect(book.openAccessLinks?.[0].url).toBe(openAccessLink.href);
    expect(book.borrowUrl).toBe(borrowLink.href);
    expect(book.allBorrowLinks?.[0].url).toBe(borrowLink.href);
    expect(book.fulfillmentLinks?.[0].url).toBe(fulfillmentLink.href);
    expect(book.fulfillmentLinks?.[0].type).toBe(fulfillmentLink.type);
    expect(book.fulfillmentLinks?.[0].indirectType).toBe(
      fulfillmentLink.indirectAcquisitions[0].type
    );
    expect(book.availability).toEqual(borrowLink.availability);
    expect(book.holds).toBe(borrowLink.holds);
    expect(book.copies).toBe(borrowLink.copies);
  });

  test("extracts navigation link info", () => {
    const navigationLink = factory.link({
      href: "href"
    });

    const linkEntry = factory.entry({
      id: "feed.xml",
      title: "Feed",
      links: [navigationLink]
    });

    const navigationFeed = factory.navigationFeed({
      id: "some id",
      entries: [linkEntry]
    });

    const collection = feedToCollection(navigationFeed, "http://test-url.com");
    expect(collection.navigationLinks.length).toBe(1);
    const link = collection.navigationLinks[0];
    expect(link.id).toBe(linkEntry.id);
    expect(link.text).toBe(linkEntry.title);
    expect(link.url).toBe(`http://test-url.com/${navigationLink.href}`);
  });

  test("extracts facet groups", () => {
    const facetLinks = [
      factory.facetLink({
        href: "href1",
        title: "title 1",
        facetGroup: "group A",
        activeFacet: true
      }),
      factory.facetLink({
        href: "href2",
        title: "title 2",
        facetGroup: "group B",
        activeFacet: false
      }),
      factory.facetLink({
        href: "href3",
        title: "title 3",
        facetGroup: "group A"
      })
    ];

    const acquisitionFeed = factory.acquisitionFeed({
      id: "some id",
      entries: [],
      links: facetLinks
    });

    const collection = feedToCollection(acquisitionFeed, "http://test-url.com");
    expect(collection.facetGroups?.length).toBe(2);

    const groupA = collection.facetGroups?.[0];
    expect(groupA?.label).toBe("group A");
    expect(groupA?.facets.length).toBe(2);

    const groupB = collection.facetGroups?.[1];
    expect(groupB?.label).toBe("group B");
    expect(groupB?.facets.length).toBe(1);

    const facet1 = groupA?.facets[0];
    expect(facet1?.label).toBe("title 1");
    expect(facet1?.active).toBeTruthy();
    expect(facet1?.href).toBe("http://test-url.com/href1");

    const facet2 = groupB?.facets[0];
    expect(facet2?.label).toBe("title 2");
    expect(facet2?.active).not.toBeTruthy();
    expect(facet2?.href).toBe("http://test-url.com/href2");

    const facet3 = groupA?.facets[1];
    expect(facet3?.label).toBe("title 3");
    expect(facet3?.active).not.toBeTruthy();
    expect(facet3?.href).toBe("http://test-url.com/href3");
  });

  test("extracts related link", () => {
    const relatedLink = factory.opdsLink({
      href: "/related",
      rel: "related"
    });

    const entry = factory.entry({
      id: "some id",
      authors: [],
      contributors: [],
      categories: [],
      summary: {
        content: "summary"
      },
      links: [relatedLink]
    });

    const book = entryToBook(entry, "http://test-url.com");
    expect(book.relatedUrl).toBe("/related");
  });

  test("extracts trackOpenBookUrl", () => {
    const openBookLink = factory.opdsLink({
      href: "/track-open-book",
      rel: "http://librarysimplified.org/terms/rel/analytics/open-book"
    });
    const entry = factory.entry({
      id: "some id",
      authors: [],
      contributors: [],
      categories: [],
      summary: {
        content: "summary"
      },
      links: [openBookLink]
    });

    const book = entryToBook(entry, "http://test-url.com");
    expect(book.trackOpenBookUrl).toBe("/track-open-book");
  });

  test("extracts next page url", () => {
    const nextLink = factory.link({
      href: "href",
      rel: "next"
    });

    const acquisitionFeed = factory.acquisitionFeed({
      id: "some id",
      entries: [],
      links: [nextLink]
    });

    const collection = feedToCollection(acquisitionFeed, "http://test-url.com");
    expect(collection.nextPageUrl).toBe("http://test-url.com/href");
  });

  test("extracts shelf url", () => {
    const shelfLink = factory.shelfLink({
      href: "loans",
      rel: OPDSShelfLink.REL
    });

    const acquisitionFeed = factory.acquisitionFeed({
      id: "some id",
      entries: [],
      links: [shelfLink]
    });

    const collection = feedToCollection(acquisitionFeed, "http://test-url.com");
    expect(collection.shelfUrl).toBe(shelfLink.href);
  });

  test("extracts top-level links", () => {
    const aboutLink = factory.link({
      href: "about",
      rel: "about"
    });
    const termsLink = factory.link({
      href: "terms",
      rel: "terms-of-service"
    });

    const acquisitionFeed = factory.acquisitionFeed({
      id: "some id",
      entries: [],
      links: [aboutLink, termsLink]
    });

    const collection = feedToCollection(acquisitionFeed, "http://test-url.com");
    expect(collection.links?.length).toBe(2);
    const urls = collection.links?.map(link => link.url).sort();
    const types = collection.links?.map(link => link.type).sort();
    expect(urls).toEqual([
      "http://test-url.com/about",
      "http://test-url.com/terms"
    ]);
    expect(types).toEqual(["about", "terms-of-service"]);
  });
});