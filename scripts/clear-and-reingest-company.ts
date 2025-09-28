#!/usr/bin/env tsx

/**
 * Clear existing Weaviate data and re-ingest company repository
 * with correct metadata and source attribution
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import weaviate, { WeaviateClient } from 'weaviate-ts-client';
import { LocalRepositoryProcessor } from '../src/lib/ingestion/local-processor';
import { createWeaviateClient, testConnection } from '../src/lib/weaviate/client';

async function clearAndReingestCompany() {
  console.log('🚀 Starting company data re-ingestion process...\n');

  // Initialize Weaviate client
  const client: WeaviateClient = weaviate.client({
    scheme: process.env.WEAVIATE_SCHEME || 'https',
    host: process.env.WEAVIATE_HOST || 'localhost:8080',
    apiKey: process.env.WEAVIATE_API_KEY ?
      new weaviate.ApiKey(process.env.WEAVIATE_API_KEY) :
      undefined,
  });

  try {
    // Test connection
    console.log('🔌 Testing Weaviate connection...');
    const connected = await testConnection();

    if (!connected) {
      console.error('❌ Failed to connect to Weaviate. Check your configuration.');
      process.exit(1);
    }

    console.log('✅ Weaviate connection successful\n');

    // Step 1: Count existing documents
    console.log('📊 Checking existing documents...');
    const countResult = await client.graphql
      .aggregate()
      .withClassName('Document')
      .withFields('meta { count }')
      .do();

    const totalDocs = countResult.data.Aggregate.Document?.[0]?.meta?.count || 0;
    console.log(`   Found ${totalDocs} total documents in Weaviate\n`);

    // Step 2: Query documents by source
    console.log('📈 Analyzing documents by source...');
    const sourceStats = await client.graphql
      .aggregate()
      .withClassName('Document')
      .withGroupBy(['source'])
      .withFields('groupedBy { source } meta { count }')
      .do();

    const stats = sourceStats.data.Aggregate.Document || [];
    console.log('   Current distribution:');
    stats.forEach((stat: any) => {
      console.log(`     ${stat.groupedBy.source}: ${stat.meta.count} documents`);
    });
    console.log('');

    // Step 3: Delete documents with incorrect metadata
    console.log('🗑️  Clearing documents with incorrect metadata...');

    // Delete documents with source='local' or source='github' that should be 'company'
    const deleteQuery = await client.graphql
      .get()
      .withClassName('Document')
      .withWhere({
        operator: 'Or',
        operands: [
          {
            path: ['source'],
            operator: 'Equal',
            valueText: 'local',
          },
          {
            path: ['source'],
            operator: 'Equal',
            valueText: 'github',
          }
        ]
      })
      .withFields('id')
      .withLimit(1000)
      .do();

    const docsToDelete = deleteQuery.data.Get.Document || [];
    console.log(`   Found ${docsToDelete.length} documents to delete`);

    if (docsToDelete.length > 0) {
      console.log('   Deleting documents in batches...');
      let deleted = 0;

      for (const doc of docsToDelete) {
        try {
          await client.data
            .deleter()
            .withClassName('Document')
            .withId(doc.id)
            .do();
          deleted++;

          if (deleted % 50 === 0) {
            console.log(`     Deleted ${deleted}/${docsToDelete.length} documents`);
          }
        } catch (error) {
          console.error(`     Failed to delete document ${doc.id}:`, error);
        }
      }

      console.log(`   ✅ Deleted ${deleted} documents\n`);
    } else {
      console.log('   No documents to delete\n');
    }

    // Step 4: Re-ingest company data
    console.log('📂 Re-ingesting company data from /Users/alex/rag-data/speedboat...');

    const processor = new LocalRepositoryProcessor({
      basePath: '/Users/alex/rag-data/speedboat'
    });

    // Process files
    console.log('   Discovering files...');
    const files = await processor.processRepository();

    console.log(`   Found ${files.length} files to ingest`);

    const fileStats = {
      code: files.filter(f => f.metadata.isCode).length,
      docs: files.filter(f => f.metadata.isDocumentation).length,
      config: files.filter(f => f.metadata.fileType === 'config').length,
      other: files.filter(f => !f.metadata.isCode && !f.metadata.isDocumentation && f.metadata.fileType !== 'config').length
    };

    console.log(`     Code files: ${fileStats.code}`);
    console.log(`     Documentation: ${fileStats.docs}`);
    console.log(`     Configuration: ${fileStats.config}`);
    console.log(`     Other: ${fileStats.other}\n`);

    // Ingest with correct metadata
    console.log('🚀 Starting ingestion with correct metadata...');

    const newClient = createWeaviateClient();
    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        // Generate proper company GitHub URL
        const githubUrl = `https://github.com/company/website/blob/main/${file.relativePath}`;

        const document = {
          content: file.content,
          source: 'company', // Use 'company' as source
          filepath: file.relativePath,
          url: githubUrl,
          lastModified: file.lastModified.toISOString(),
          priority: 1.5, // Higher priority for company content
          language: file.language,
          isCode: file.metadata.isCode,
          isDocumentation: file.metadata.isDocumentation,
          fileType: file.metadata.fileType,
          size: file.size,
          metadata: {
            ...file.metadata,
            url: githubUrl,
            repository: 'company/website',
            source: 'company',
            ingestedAt: new Date().toISOString()
          }
        };

        await newClient.data.creator()
          .withClassName('Document')
          .withProperties(document)
          .do();

        successCount++;

        if (successCount % 50 === 0) {
          console.log(`   ✅ Ingested ${successCount}/${files.length} files`);
        }

      } catch (error) {
        errorCount++;
        console.error(`   ❌ Failed to ingest ${file.relativePath}:`, error);
      }
    }

    console.log(`\n📊 Ingestion Complete:`);
    console.log(`   ✅ Successfully ingested: ${successCount} files`);
    console.log(`   ❌ Failed: ${errorCount} files`);
    console.log(`   📈 Success rate: ${((successCount / files.length) * 100).toFixed(1)}%\n`);

    // Step 5: Verify final state
    console.log('🔍 Verifying final state...');

    const finalStats = await client.graphql
      .aggregate()
      .withClassName('Document')
      .withGroupBy(['source'])
      .withFields('groupedBy { source } meta { count }')
      .do();

    const finalData = finalStats.data.Aggregate.Document || [];
    console.log('   Final document distribution:');
    finalData.forEach((stat: any) => {
      console.log(`     ${stat.groupedBy.source}: ${stat.meta.count} documents`);
    });

    // Test a sample query
    console.log('\n🧪 Testing sample query for company content...');

    const testQuery = await client.graphql
      .get()
      .withClassName('Document')
      .withWhere({
        path: ['source'],
        operator: 'Equal',
        valueText: 'company',
      })
      .withFields('filepath url source')
      .withLimit(3)
      .do();

    const sampleDocs = testQuery.data.Get.Document || [];
    console.log('   Sample company documents:');
    sampleDocs.forEach((doc: any) => {
      console.log(`     - ${doc.filepath}`);
      console.log(`       URL: ${doc.url}`);
    });

    console.log('\n✅ Company data re-ingestion completed successfully!');
    console.log('   The RAG agent should now have access to company documentation.');

  } catch (error) {
    console.error('❌ Error during re-ingestion:', error);
    process.exit(1);
  }
}

// Run the script
clearAndReingestCompany()
  .then(() => {
    console.log('\n🎉 Process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });