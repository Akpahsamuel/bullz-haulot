export const getUserRegistryTableId = async (client: any, userRegistryId: string): Promise<string | null> => {
  const userRegistryObject = await client.getObject({
    id: userRegistryId,
    options: { showContent: true },
  });

  if (!userRegistryObject.data?.content || userRegistryObject.data.content.dataType !== 'moveObject') {
    console.error('Invalid user registry object');
    return null;
  }

  const registryFields = userRegistryObject.data.content.fields as any;
  const usersTableId = registryFields.users?.fields?.id?.id;
  
  if (!usersTableId) {
    console.error('Users table not found in registry');
    return null;
  }

  return usersTableId;
};

export const getUserOwnedAssets = async ({
  client,
  usersTableId,
  userAddress
}: {
  client: any;
  usersTableId: string;
  userAddress: string;
}): Promise<string[]> => {
  const dynamicFields = await client.getDynamicFields({
    parentId: usersTableId,
  });

  const userField = dynamicFields.data.find((field: any) => field.name.value === userAddress);
  if (!userField) {
    return [];
  }

  const userDataObject = await client.getObject({
    id: userField.objectId,
    options: { showContent: true },
  });

  if (!userDataObject.data?.content || userDataObject.data.content.dataType !== 'moveObject') {
    console.error('Invalid user data object');
    return [];
  }

  const userDataFields = userDataObject.data.content.fields as any;
  return userDataFields.value?.fields?.owned_assets || [];
};

export const getUserBalancesTableId = async (client: any, vaultId: string): Promise<string | null> => {
  const vaultObject = await client.getObject({
    id: vaultId,
    options: { showContent: true },
  });

  if (!vaultObject.data?.content || vaultObject.data.content.dataType !== 'moveObject') {
    return null;
  }

  const vaultFields = vaultObject.data.content.fields as any;
  return vaultFields.user_balances?.fields?.id?.id || null;
};

export const findUserBalanceField = async ({
  client,
  userBalancesTableId,
  userAddress
}: {
  client: any;
  userBalancesTableId: string;
  userAddress: string;
}): Promise<string | null> => {
  const balanceDynamicFields = await client.getDynamicFields({
    parentId: userBalancesTableId,
  });

  const userBalanceField = balanceDynamicFields.data.find((field: any) => field.name.value === userAddress);
  return userBalanceField?.objectId || null;
};

export const getBalanceValue = async (client: any, balanceObjectId: string): Promise<string> => {
  const balanceObject = await client.getObject({
    id: balanceObjectId,
    options: { showContent: true },
  });

  if (balanceObject.data?.content && balanceObject.data.content.dataType === 'moveObject') {
    const balanceFields = balanceObject.data.content.fields as any;
    return balanceFields.value || '0';
  }

  return '0';
};

export const getUserBalanceForVault = async ({
  client,
  vaultId,
  userAddress
}: {
  client: any;
  vaultId: string;
  userAddress: string;
}): Promise<string> => {
  const userBalancesTableId = await getUserBalancesTableId(client, vaultId);
  if (!userBalancesTableId) {
    return '0';
  }

  const balanceObjectId = await findUserBalanceField({
    client,
    userBalancesTableId,
    userAddress
  });
  if (!balanceObjectId) {
    return '0';
  }

  return getBalanceValue(client, balanceObjectId);
};

