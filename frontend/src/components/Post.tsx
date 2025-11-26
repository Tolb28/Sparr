import React, { useState } from "react";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Input, InputField, InputSlot} from '@/components/ui/input';
import { Text } from "@/components/ui/text";
import { Image } from "@/components/ui/image";
import {
  User,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
} from "lucide-react-native";
import { Pressable } from "@/components/ui/pressable";


function FeedPost({ type = "default" }) {
  const [likes, setLikes] = useState(70);
  const [dislikes, setDislikes] = useState(70);
  const [comments, setComments] = useState(70);

  const handleLike = () => setLikes((prev) => prev + 1);
  const handleDislike = () => setDislikes((prev) => prev + 1);
  const handleComment = () => setComments((prev) => prev + 1);

  return (
    <Box className="bg-white mx-3 mb-3 p-3 rounded-lg border border-gray-200">
      {/* User Row */}
      <HStack className="items-center mb-3 gap-2">
        <Icon as={User} size="lg" className="text-gray-700" />
        <Text className="font-bold text-base">Profile_Name</Text>
      </HStack>

      {type !== "textOnly" && (
        <Box className="bg-gray-200 rounded-md mb-3 justify-center items-center aspect-square">
            <Image className="bg-gray-200 rounded-md mb-3 justify-center items-center aspect-square" />
        </Box>
      )}

      {type === "textOnly" && (
        <Text className="text-gray-700 leading-5 mb-3">
          Lorem ipsum dolor sit amet et delectus accommodare his consul copiosae
          legendos at vix ad putent delectus delicata usu.
        </Text>
      )}

      {/* Reactions */}
      <HStack className="gap-6 items-center mb-3">
        <Pressable onPress={handleLike}>
          <HStack className="items-center gap-1">
            <Icon as={ThumbsUp} size="md" className="text-blue-600" />
            <Text className="text-sm text-gray-800">{likes}</Text>
          </HStack>
        </Pressable>

        <Pressable onPress={handleDislike}>
          <HStack className="items-center gap-1">
            <Icon as={ThumbsDown} size="md" className="text-red-600" />
            <Text className="text-sm text-gray-800">{dislikes}</Text>
          </HStack>
        </Pressable>

        <Pressable onPress={handleComment}>
          <HStack className="items-center gap-1">
            <Icon as={MessageCircle} size="md" className="text-gray-700" />
            <Text className="text-sm text-gray-800">{comments}</Text>
          </HStack>
        </Pressable>
      </HStack>

      {/* Description */}
      {type !== "textOnly" && (
        <Text className="text-gray-700 text-sm">
          <Text className="font-bold">Profile_Name </Text>
          Lorem ipsum dolor sit amet et delectus accommodare his consul copiosae
          legendos at vix ad putent delectus delicata usu.
        </Text>
      )}
    </Box>
  );
}
export default FeedPost;