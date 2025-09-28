#!/usr/bin/env tsx

import 'dotenv/config';
import weaviate, { WeaviateClient } from 'weaviate-ts-client';

/**
 * Script to fix remaining documents with source='local'
 * Updates them to source='github' with proper URLs
 */

async function fixLocalSourceMetadata() {
  console.log('🔧 Starting metadata fix for source=local documents...\n');

  // Initialize Weaviate client
  const client: WeaviateClient = weaviate.client({
    scheme: process.env.WEAVIATE_SCHEME || 'https',
    host: process.env.WEAVIATE_HOST || 'localhost:8080',
    apiKey: process.env.WEAVIATE_API_KEY ?
      new weaviate.ApiKey(process.env.WEAVIATE_API_KEY) :
      undefined,
  });

  try {
    // Query for all documents with source='local'
    console.log('📋 Fetching documents with source=local...');

    const result = await client.graphql
      .get()
      .withClassName('Document')
      .withWhere({
        path: ['source'],
        operator: 'Equal',
        valueText: 'local',
      })
      .withFields('id filepath source url metadata { url }')
      .withLimit(100)
      .do();

    const documents = result.data.Get.Document || [];
    console.log(`Found ${documents.length} documents with source='local'\n`);

    if (documents.length === 0) {
      console.log('✅ No documents with source=local found. Nothing to fix!');
      return;
    }

    // Analyze the filepaths to determine proper categorization
    const eslintConfigFiles = documents.filter((doc: any) =>
      doc.filepath?.includes('packages/eslint-config/')
    );

    console.log('📊 Document breakdown:');
    console.log(`  - ESLint config files: ${eslintConfigFiles.length}`);
    console.log(`  - Other files: ${documents.length - eslintConfigFiles.length}\n`);

    // Fix each document
    console.log('🔄 Updating documents...');

    for (const doc of documents) {
      const filepath = doc.filepath;

      // Determine the correct source and URL
      let newSource = 'github';
      let newUrl = '';
      let newPriority = 1.2;

      if (filepath?.includes('packages/eslint-config/')) {
        // These are company website config files
        newUrl = `https://github.com/company/website/blob/main/${filepath}`;
        console.log(`  ✏️  Fixing: ${filepath}`);
        console.log(`      → source: local → github`);
        console.log(`      → url: local://${filepath} → ${newUrl}`);
      } else if (filepath?.includes('apps/')) {
        // Apps directory files
        newUrl = `https://github.com/company/website/blob/main/${filepath}`;
        console.log(`  ✏️  Fixing: ${filepath}`);
        console.log(`      → source: local → github`);
        console.log(`      → url: local://${filepath} → ${newUrl}`);
      } else {
        // Unknown files - log them but don't update
        console.log(`  ⚠️  Skipping unknown file: ${filepath}`);
        continue;
      }

      // Update the document
      try {
        await client.data
          .merger()
          .withClassName('Document')
          .withId(doc.id)
          .withProperties({
            source: newSource,
            url: newUrl,
            priority: newPriority,
            metadata: {
              ...doc.metadata,
              url: newUrl,
              fixedAt: new Date().toISOString(),
              previousSource: 'local',
            }
          })
          .do();

        console.log(`      ✅ Updated successfully\n`);
      } catch (error) {
        console.error(`      ❌ Failed to update: ${error}\n`);
      }
    }

    // Verify the fix
    console.log('\n📊 Verifying fix...');

    const verifyResult = await client.graphql
      .get()
      .withClassName('Document')
      .withWhere({
        path: ['source'],
        operator: 'Equal',
        valueText: 'local',
      })
      .withFields('id')
      .withLimit(10)
      .do();

    const remainingLocal = verifyResult.data.Get.Document || [];

    if (remainingLocal.length === 0) {
      console.log('✅ All documents successfully fixed! No more source=local documents.');
    } else {
      console.log(`⚠️  ${remainingLocal.length} documents still have source=local`);
    }

    // Show final statistics
    console.log('\n📈 Final Statistics:');

    const statsQuery = await client.graphql
      .aggregate()
      .withClassName('Document')
      .withGroupBy(['source'])
      .withFields('groupedBy { source } meta { count }')
      .do();

    const stats = statsQuery.data.Aggregate.Document || [];
    console.log('Documents by source:');
    stats.forEach((stat: any) => {
      const source = stat.groupedBy.source;
      const count = stat.meta.count;
      console.log(`  ${source}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Error during metadata fix:', error);
    process.exit(1);
  }
}

// Run the script
fixLocalSourceMetadata()
  .then(() => {
    console.log('\n✅ Metadata fix completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });