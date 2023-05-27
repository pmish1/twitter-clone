import type {
  GetStaticPaths,
  GetStaticPropsContext,
  InferGetServerSidePropsType,
  NextPage,
} from "next";
import { useSession } from "next-auth/react";
import Error from "next/error";
import Head from "next/head";
import Link from "next/link";
import { VscArrowLeft } from "react-icons/vsc";
import { CustomButton } from "~/components/Button";
import { IconHoverEffect } from "~/components/IconHoverEffect";
import { InfiniteTweetList } from "~/components/InfiniteTweetList";
import { ProfileImage } from "~/components/ProfileImage";
import { ssgHelper } from "~/server/api/ssgHelper";
import { api } from "~/utils/api";

const ProfilePage: NextPage<
  InferGetServerSidePropsType<typeof getStaticProps>
> = ({ id }) => {
  const { data: profile } = api.profile.getById.useQuery({ id });
  const tweets = api.tweet.infiniteProfileFeed.useInfiniteQuery(
    { userId: id },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  );
  const trpcUtils = api.useContext();
  const toggleFollow = api.profile.toggleFollow.useMutation({
    onSuccess: ({ addedFollow }) => {
      trpcUtils.profile.getById.setData({ id }, (oldData) => {
        if (!oldData) return;
        const countModifier = addedFollow ? 1 : -1;
        return {
          ...oldData,
          isFollowing: addedFollow,
          followersCount: oldData.followersCount + countModifier,
        };
      });
    },
  });
  if (!profile || !profile.name) return <Error statusCode={404} />;
  return (
    <>
      <Head>
        <title>{`Twitter Clone - ${profile.name}`}</title>
      </Head>
      <header className="sticky top-0 z-10 flex items-center border-b bg-white px-4 py-2">
        <Link href=".." className="mr-2">
          <IconHoverEffect>
            <VscArrowLeft className="h-6 w-6" />
          </IconHoverEffect>
        </Link>
        <ProfileImage src={profile.image} className="flex-shrink-0" />
        <div className="ml-2 flex-grow">
          <h1 className="text-lg font-bold">{profile.name}</h1>
          <div className="text-gray-500">
            {profile.tweetsCount}{" "}
            {getPlural(profile.tweetsCount, "Tweet", "Tweets")} -{" "}
            {profile.followersCount}{" "}
            {getPlural(profile.followersCount, "Follower", "Followers")} -{" "}
            {profile.followsCount} Following
          </div>
        </div>
        <FollowButton
          isFollowing={profile.isFollowing}
          isLoading={toggleFollow.isLoading}
          userId={id}
          onClick={() => toggleFollow.mutate({ userId: id })}
        />
      </header>
      <main>
        <InfiniteTweetList
          tweets={tweets.data?.pages.flatMap((page) => page.tweets)}
          isError={tweets.isError}
          isLoading={tweets.isLoading}
          hasMore={tweets.hasNextPage || false}
          fetchNewTweets={tweets.fetchNextPage}
        />
      </main>
    </>
  );
};

function FollowButton({
  userId,
  isFollowing,
  isLoading,
  onClick,
}: {
  userId: string;
  isFollowing: boolean;
  isLoading: boolean;
  onClick: () => void;
}) {
  const session = useSession();
  if (session.status !== "authenticated" || session.data.user.id === userId) {
    return null;
  }
  return (
    <CustomButton
      disabled={isLoading}
      onClick={onClick}
      small
      gray={isFollowing}
    >
      {isFollowing ? "Unfollow" : "Follow"}
    </CustomButton>
  );
}

export const getStaticPaths: GetStaticPaths = () => {
  return {
    paths: [],
    //when trying to access a page which doesn't exist, dont pass down the html to client,
    //before done generating, then store in cache for later
    fallback: "blocking",
  };
};

const pluralRules = new Intl.PluralRules();
function getPlural(number: number, singular: string, plural: string) {
  return pluralRules.select(number) === "one" ? singular : plural;
}

export async function getStaticProps(
  context: GetStaticPropsContext<{ id: string }>
) {
  const id = context.params?.id;

  if (!id) {
    return { redirect: { destination: "/" } };
  }

  const ssg = ssgHelper();
  await ssg.profile.getById.prefetch({ id });

  return {
    props: {
      id,
      trpcState: ssg.dehydrate(),
    },
  };
}

export default ProfilePage;
